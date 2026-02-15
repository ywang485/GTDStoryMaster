"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/stores/use-game-store";
import { useSetupStore } from "@/stores/use-setup-store";
import { useUIStore } from "@/stores/use-ui-store";
import { useToolStore } from "@/stores/use-tool-store";
import { HydrationGate } from "@/components/providers/hydration-gate";
import { QuestSidebar } from "@/components/game/quest-sidebar";
import { SceneHeader } from "@/components/game/scene-header";
import { StoryWorldRenderer } from "@/components/storyworld";
import { NarrativeViewport } from "@/components/game/narrative-viewport";
import { getCurrentScene } from "@/lib/engine/quest-tracker";
import { processAction } from "@/lib/engine/game-manager";
import {
  buildTurnContext,
  getCurrentEnvironment,
} from "@/lib/engine/context-builder";
import { MappingBridge } from "@/lib/storyworld/mapping-bridge";
import type { ToolStoryworldMappingConfig } from "@/lib/storyworld/mapping-bridge";
import type { StoryWorldRendererInterface } from "@/lib/storyworld";
import type { BaseStoryWorldExecutor } from "@/lib/storyworld";
import type { NarrativeEntry } from "@/types/story";

import mappingConfig from "@/lib/storyworld/mappings/todo-to-stardew.json";

/**
 * Registry of available storyworld executors keyed by the storyworld ID
 * used in mapping configs. This keeps the page generic — adding a new
 * storyworld only requires a new entry here (and a new mapping JSON).
 */
async function loadExecutor(storyworldId: string): Promise<BaseStoryWorldExecutor> {
  switch (storyworldId) {
    case "stardew-valley-world-v1": {
      const { StardewValleyExecutor } = await import(
        "@/lib/storyworld/examples/stardew-valley-executor"
      );
      return new StardewValleyExecutor();
    }
    case "fantasy-world-v1": {
      const { FantasyWorldExecutor } = await import(
        "@/lib/storyworld/examples/fantasy-executor"
      );
      return new FantasyWorldExecutor();
    }
    default:
      throw new Error(`Unknown storyworld: ${storyworldId}`);
  }
}

// ── Story text extraction (same as original adventure page) ────────────────

function extractStoryText(rawText: string): string | null {
  const storyMatch = rawText.match(/STORY:\s*([\s\S]*?)(?=\nDATA:|$)/);
  if (storyMatch) {
    return storyMatch[1].trim();
  }

  let text = rawText.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "");
    text = text.replace(/\n?```\s*$/, "");
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed.storyText) {
      return parsed.storyText;
    }
  } catch {
    // incomplete JSON
  }

  const jsonMatch = text.match(/"storyText"\s*:\s*"((?:[^"\\]|\\[\s\S])*)"/);
  if (jsonMatch) {
    try {
      return JSON.parse(`"${jsonMatch[1]}"`);
    } catch {
      return jsonMatch[1]
        .replace(/\\n/g, "\n")
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, "\\");
    }
  }

  return null;
}

/**
 * Splits text into complete sentences (ending with . ! ? 。 ！ ？).
 * Returns the sentences and the character index in the original text
 * where the last sentence ends, so callers can extract trailing
 * partial text via `text.slice(endIndex)`.
 */
function splitIntoSentences(text: string): { sentences: string[]; endIndex: number } {
  const sentences: string[] = [];
  // Match everything up to and including sentence-ending punctuation,
  // optionally followed by closing quotes/parens.
  const regex = /[^.!?。！？]*[.!?。！？]+["')\u201D\u300D]*/g;
  let match;
  let endIndex = 0;
  while ((match = regex.exec(text)) !== null) {
    const sentence = match[0].trim();
    if (sentence) {
      sentences.push(sentence);
      endIndex = match.index + match[0].length;
    }
  }
  return { sentences, endIndex };
}

// ── Main game component ────────────────────────────────────────────────────

function AdventureGameVisual() {
  const router = useRouter();
  const {
    phase,
    plotStructure,
    character,
    narrativeLog,
    completedTaskIds,
    turnCount,
    currentSceneId,
    environment,
    tasks,
    addNarrativeEntry,
    completeTask,
    skipTask,
    setCurrentScene,
    incrementTurn,
    setEnvironment,
    setPhase,
    getTasks,
    syncTasksFromTool,
  } = useGameStore();

  const { profile, storyWorld } = useSetupStore();
  const { isStreaming, setIsStreaming, sidebarOpen } = useUIStore();
  const { getPublicStates: getToolPublicStates } = useToolStore();

  const [streamingText, setStreamingText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const hasInitialized = useRef(false);

  // Storyworld state
  const [executor, setExecutor] = useState<BaseStoryWorldExecutor | null>(null);
  const [bridge, setBridge] = useState<MappingBridge | null>(null);
  const rendererRef = useRef<StoryWorldRendererInterface>(null);

  // ── Initialize executor + bridge from mapping config ───────────────────

  useEffect(() => {
    const cfg = mappingConfig as ToolStoryworldMappingConfig;
    let cancelled = false;

    loadExecutor(cfg.storyworld).then((exec) => {
      if (cancelled) return;
      exec.setCanvasSize(800, 600);
      setExecutor(exec);
      setBridge(new MappingBridge(cfg, exec));
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Connect renderer to executor once both are ready
  useEffect(() => {
    if (executor && rendererRef.current) {
      executor.setRenderer(rendererRef.current);
    }
  }, [executor]);

  // ── Sync tasks → storyworld objects ────────────────────────────────────

  useEffect(() => {
    if (!bridge) return;
    bridge.syncTasks(tasks);
  }, [bridge, tasks]);

  // ── Redirect if not playing ────────────────────────────────────────────

  useEffect(() => {
    if (phase !== "playing" && phase !== "completed") {
      router.push("/");
    }
  }, [phase, router]);

  // Derive scene / task
  const currentScene = plotStructure
    ? getCurrentScene(plotStructure, completedTaskIds)
    : null;

  const currentActTitle = plotStructure
    ? plotStructure.acts.find((act) =>
        act.scenes.some((s) => s.id === currentSceneId),
      )?.title
    : undefined;

  // ── Initial narration ──────────────────────────────────────────────────

  useEffect(() => {
    if (
      plotStructure &&
      currentScene &&
      narrativeLog.length === 0 &&
      !isStreaming &&
      !hasInitialized.current
    ) {
      hasInitialized.current = true;
      handleNarrate("begin the adventure");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotStructure, currentScene]);

  // ── Narrate handler ────────────────────────────────────────────────────

  const handleNarrate = useCallback(
    async (playerInput: string) => {
      // Read isStreaming from store directly to avoid stale closure
      if (
        !plotStructure ||
        !currentScene ||
        !storyWorld ||
        useUIStore.getState().isStreaming
      )
        return;

      setIsStreaming(true);
      setStreamingText("");

      const env = getCurrentEnvironment(environment.mood, environment.weather);
      setEnvironment(env);

      const currentTasks = getTasks();
      const toolStates = { todoList: getToolPublicStates() };

      const turnContext = buildTurnContext({
        turnNumber: turnCount + 1,
        currentScene,
        tasks: currentTasks,
        narrativeLog,
        playerInput,
        environment: env,
        toolStates,
      });

      let responseExamples: string[] = [];

      try {
        const response = await fetch("/api/ai/narrate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            turnContext,
            profile,
            character,
            storyWorld,
            plotStructure,
          }),
        });

        if (!response.ok || !response.body) {
          throw new Error("Narration request failed");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let fullText = "";
        let finalResponse: any = null;
        let displayedSentenceCount = 0;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;

          // Extract and stream the storyText as it's being generated
          const extracted = extractStoryText(fullText);
          if (extracted) {
            setStreamingText(extracted);

            const { sentences, endIndex } = splitIntoSentences(extracted);

            // Commit newly completed sentences
            if (displayedSentenceCount < sentences.length) {
              // The first new sentence was being streamed — update & commit
              rendererRef.current?.streamText(sentences[displayedSentenceCount]);
              rendererRef.current?.commitStreamedText();
              displayedSentenceCount++;

              // Queue any additional sentences that completed in this chunk
              while (displayedSentenceCount < sentences.length) {
                rendererRef.current?.displayText(
                  sentences[displayedSentenceCount],
                  { waitForClick: true },
                );
                displayedSentenceCount++;
              }
            }

            // Stream the partial text after the last sentence break
            const partialText = extracted.slice(endIndex).trim();
            if (partialText) {
              rendererRef.current?.streamText(partialText);
            } else if (sentences.length === 0) {
              // No complete sentences yet — stream everything
              rendererRef.current?.streamText(extracted);
            }
          }
        }

        // Parse final response
        const storyMatch = fullText.match(
          /STORY:\s*([\s\S]*?)(?=\nDATA:|$)/,
        );
        const dataMatch = fullText.match(/DATA:\s*({[\s\S]*})/);

        let storyText = "";

        if (storyMatch && dataMatch) {
          storyText = storyMatch[1].trim();
          try {
            const data = JSON.parse(dataMatch[1].trim());
            finalResponse = { storyText, ...data };
          } catch (e) {
            console.error("Failed to parse DATA JSON:", e);
          }
        } else {
          let jsonText = fullText.trim();
          if (jsonText.startsWith("```")) {
            jsonText = jsonText.replace(/^```(?:json)?\s*\n?/, "");
            jsonText = jsonText.replace(/\n?```\s*$/, "");
          }
          try {
            finalResponse = JSON.parse(jsonText);
          } catch (e) {
            console.error("Failed to parse final JSON:", e);
          }
        }

        if (finalResponse && finalResponse.storyText) {
          // Commit any remaining streamed text and flush trailing partial
          if (rendererRef.current) {
            rendererRef.current.commitStreamedText();
            const { endIndex } = splitIntoSentences(finalResponse.storyText);
            const remaining = finalResponse.storyText.slice(endIndex).trim();
            if (remaining) {
              rendererRef.current.displayText(remaining, {
                waitForClick: true,
              });
            }
          }

          // Add to narrative log
          const { storyText: _, ...rawData } = finalResponse;
          const narratorEntry: NarrativeEntry = {
            id: `narrator-${Date.now()}`,
            role: "narrator",
            content: finalResponse.storyText,
            timestamp: Date.now(),
            sceneId: currentScene.id,
            productivityObservation: finalResponse.productivityObservation,
            explanation: finalResponse.explanation,
            rawData,
          };
          addNarrativeEntry(narratorEntry);

          // Execute tool calls and propagate to storyworld
          if (finalResponse.toolCalls && finalResponse.toolCalls.length > 0) {
            const toolStore = useToolStore.getState();

            for (const toolCall of finalResponse.toolCalls) {
              try {
                switch (toolCall.operation) {
                  case "updateTaskStatus":
                    await toolStore.updateTaskStatus(
                      toolCall.params.taskId,
                      toolCall.params.status,
                    );
                    // Propagate to storyworld via bridge
                    if (bridge) {
                      await bridge.onToolAction(
                        toolCall.params.taskId,
                        "updateStatus",
                        { status: toolCall.params.status },
                      );
                    }
                    break;

                  case "reorderTasks":
                    await toolStore.reorderTasks(toolCall.params.taskIds);
                    break;

                  case "addTask": {
                    const result = await toolStore.createTask({
                      title: toolCall.params.title,
                      description: toolCall.params.description,
                    });
                    // Create corresponding storyworld object for the new task
                    const output = result.output as
                      | { taskId?: string }
                      | undefined;
                    if (bridge && output?.taskId) {
                      bridge.ensureObjectForTask({
                        id: output.taskId,
                        title: toolCall.params.title,
                        content: toolCall.params.title,
                      });
                    }
                    break;
                  }

                  case "deleteTask":
                    await toolStore.deleteTask(toolCall.params.taskId);
                    break;

                  default:
                    console.warn("Unknown tool operation:", toolCall);
                }
              } catch (error) {
                console.error("Failed to execute tool call:", toolCall, error);
              }
            }

            syncTasksFromTool();
          }

          if (finalResponse.exampleResponses?.length > 0) {
            responseExamples = finalResponse.exampleResponses;
          }
        } else {
          console.error("No valid final response found");
        }

        incrementTurn();
        setStreamingText("");
      } catch (error) {
        console.error("Narration error:", error);
        const errMsg =
          error instanceof Error ? error.message : String(error);
        const errorEntry: NarrativeEntry = {
          id: `error-${Date.now()}`,
          role: "system",
          content: `The Story Master pauses, gathering their thoughts... (Error: ${errMsg})`,
          timestamp: Date.now(),
          sceneId: currentScene.id,
        };
        addNarrativeEntry(errorEntry);
        setStreamingText("");
        if (rendererRef.current) {
          rendererRef.current.displayText(errorEntry.content, {
            waitForClick: true,
          });
        }
      } finally {
        setIsStreaming(false);
      }

      // After narration finishes, prompt for player input via the renderer
      if (
        rendererRef.current &&
        useGameStore.getState().phase === "playing"
      ) {
        const userInput = await rendererRef.current.getUserInput({
          exampleResponses: responseExamples,
        });
        handleActionRef.current("freetext", userInput);
      }
    },
    [
      plotStructure,
      currentScene,
      storyWorld,
      turnCount,
      tasks,
      narrativeLog,
      environment,
      profile,
      character,
      bridge,
      setIsStreaming,
      setEnvironment,
      addNarrativeEntry,
      incrementTurn,
      syncTasksFromTool,
      getTasks,
      getToolPublicStates,
    ],
  );

  // ── Player action handler ──────────────────────────────────────────────

  // Ref so handleNarrate can call handleAction without a circular useCallback dep
  const handleActionRef = useRef<(type: string, content: string, taskId?: string) => void>(() => {});

  const handleAction = useCallback(
    async (type: string, content: string, taskId?: string) => {
      // Read isStreaming from store directly to avoid stale closure
      if (
        !plotStructure ||
        !currentScene ||
        useUIStore.getState().isStreaming
      )
        return;

      try {
        const action = {
          type: type as "choice" | "freetext" | "complete_task" | "skip_task",
          content,
          sceneId: currentScene.id,
          taskId,
        };

        const update = processAction(
          action,
          tasks,
          completedTaskIds,
          plotStructure,
          turnCount,
        );

        if (update.completedTaskId) {
          completeTask(update.completedTaskId);
        }

        if (action.type === "skip_task" && taskId) {
          skipTask(taskId);
        }

        if (update.taskStatusUpdates) {
          const toolStore = useToolStore.getState();
          for (const u of update.taskStatusUpdates) {
            const newStatus =
              u.status === "active"
                ? "in_progress"
                : u.status === "skipped"
                  ? "cancelled"
                  : u.status === "completed"
                    ? "completed"
                    : "pending";
            await toolStore.updateTaskStatus(u.taskId, newStatus);
            // Propagate to storyworld via bridge
            if (bridge) {
              await bridge.onToolAction(u.taskId, "updateStatus", {
                status: newStatus,
              });
            }
          }
          syncTasksFromTool();
        }

        if (update.newSceneId) {
          setCurrentScene(update.newSceneId);
        }

        if (update.newPhase) {
          setPhase(update.newPhase);
        }

        if (update.narrativeEntry) {
          addNarrativeEntry(update.narrativeEntry);
        }

        await handleNarrate(content);
      } catch (error) {
        console.error("Action error:", error);
        const errMsg =
          error instanceof Error ? error.message : String(error);
        if (rendererRef.current) {
          rendererRef.current.displayText(`Error: ${errMsg}`, {
            waitForClick: true,
          });
        }
      }
    },
    [
      plotStructure,
      currentScene,
      tasks,
      completedTaskIds,
      turnCount,
      bridge,
      completeTask,
      skipTask,
      syncTasksFromTool,
      setCurrentScene,
      setPhase,
      addNarrativeEntry,
      handleNarrate,
    ],
  );
  handleActionRef.current = handleAction;

  // ── Render ─────────────────────────────────────────────────────────────

  if (!plotStructure || phase === "setup" || !executor) {
    return null;
  }

  if (phase === "completed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8">
        <div className="max-w-lg text-center space-y-6">
          <h1 className="text-2xl font-light text-black tracking-tight">
            Complete.
          </h1>
          <p className="text-gray-600 leading-relaxed font-light">
            You have completed all your tasks and reached the end of today&apos;s
            adventure. The Story Master bows with respect.
          </p>
          <div className="text-gray-400 text-sm font-mono">
            {completedTaskIds.length} tasks / {turnCount} turns
          </div>
          <button
            onClick={() => {
              useGameStore.getState().resetGame();
              router.push("/");
            }}
            className="px-6 py-3 bg-black text-white font-light rounded-none hover:bg-gray-800 transition-colors text-sm tracking-wide"
          >
            Begin a New Adventure
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-white">
      {/* Scene Header */}
      <SceneHeader
        scene={currentScene}
        environment={environment}
        actTitle={currentActTitle}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Storyworld Canvas (replaces NarrativeViewport) */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 relative overflow-hidden min-h-0">
            {/* Absolutely positioned so the fixed-size renderer doesn't push the ActionBar off-screen */}
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <StoryWorldRenderer
                ref={rendererRef}
                executor={executor}
                width={800}
                height={600}
              />
            </div>

            {/* Loading indicator */}
            {isStreaming && (
              <div className="absolute top-2 left-2 flex items-center gap-2 px-2 py-1 bg-black/60 rounded text-white text-xs font-mono z-10">
                <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
                Story Master is writing...
              </div>
            )}

            {/* Overlay toggle button */}
            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="px-2 py-1 bg-white/80 border border-gray-300 text-gray-500 text-xs rounded hover:bg-white transition-colors font-mono"
              >
                {showHistory ? "Hide History" : "Messages"}
              </button>
            </div>

            {/* Message history overlay (reuses NarrativeViewport with streaming) */}
            {showHistory && (
              <div className="absolute inset-0 bg-white/95 z-[5] flex flex-col">
                <NarrativeViewport
                  entries={narrativeLog}
                  streamingText={streamingText}
                />
              </div>
            )}
          </div>

        </div>

        {/* Quest Sidebar */}
        {sidebarOpen && (
          <QuestSidebar
            tasks={tasks}
            completedTaskIds={completedTaskIds}
            plotStructure={plotStructure}
            currentSceneId={currentSceneId}
          />
        )}
      </div>
    </div>
  );
}

export default function AdventureVisualPage() {
  return (
    <HydrationGate>
      <AdventureGameVisual />
    </HydrationGate>
  );
}
