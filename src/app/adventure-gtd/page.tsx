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
import { PomodoroToolExecutor } from "@/lib/tools";
import type { ToolStoryworldMappingConfig } from "@/lib/storyworld/mapping-bridge";
import type { StoryWorldRendererInterface } from "@/lib/storyworld";
import type { BaseStoryWorldExecutor } from "@/lib/storyworld";
import type { NarrativeEntry } from "@/types/story";
import type { Task } from "@/types/task";

import mappingConfig from "@/lib/storyworld/mappings/gtd-suite-to-stardew.json";

async function loadExecutor(storyworldId: string): Promise<BaseStoryWorldExecutor> {
  switch (storyworldId) {
    case "stardew-valley-world-v1": {
      const { StardewValleyExecutor } = await import(
        "@/lib/storyworld/examples/stardew-valley-executor"
      );
      return new StardewValleyExecutor();
    }
    default:
      throw new Error(`Unknown storyworld: ${storyworldId}`);
  }
}

// ── Story text helpers (shared with other adventure pages) ─────────────────

function extractStoryText(rawText: string): string | null {
  const storyMatch = rawText.match(/STORY:\s*([\s\S]*?)(?=\nDATA:|$)/);
  if (storyMatch) {
    return storyMatch[1].replace(/\nD(?:A(?:T(?:A:?)?)?)?$/, "").trim();
  }

  let text = rawText.trim();
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:json)?\s*\n?/, "");
    text = text.replace(/\n?```\s*$/, "");
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed.storyText) return parsed.storyText;
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

function splitIntoSentences(text: string): { sentences: string[]; endIndex: number } {
  const sentences: string[] = [];
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

// ── Build billboard HTML from the full task list ──────────────────────────

function generateTaskListHtml(tasks: Task[], completedTaskIds: string[]): string {
  if (tasks.length === 0) return "<em>No quests yet.</em>";
  const items = tasks.map((t) => {
    const done = completedTaskIds.includes(t.id) || t.status === "completed";
    const skipped = t.status === "skipped";
    const active = t.status === "active";
    const icon = done ? "✅" : skipped ? "❌" : active ? "🔄" : "📋";
    const style = done || skipped ? "opacity:0.55;text-decoration:line-through" : active ? "font-weight:bold" : "";
    return `<li style="margin:2px 0;${style}">${icon} ${t.title}</li>`;
  }).join("");
  return `<ul style="list-style:none;padding:0;margin:0;font-size:12px;line-height:1.5">${items}</ul>`;
}

// ── Main component ─────────────────────────────────────────────────────────

function AdventureGameGTD() {
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
  const { getAllPublicStates, registerTool, getTool } = useToolStore();

  const [streamingText, setStreamingText] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [, setTickCount] = useState(0);
  const hasInitialized = useRef(false);
  const pomodoroInitialized = useRef(false);

  // Storyworld state
  const [executor, setExecutor] = useState<BaseStoryWorldExecutor | null>(null);
  const [bridge, setBridge] = useState<MappingBridge | null>(null);
  const rendererRef = useRef<StoryWorldRendererInterface>(null);

  // ── Initialize pomodoro tool if not already registered ──────────────────

  useEffect(() => {
    if (pomodoroInitialized.current) return;
    pomodoroInitialized.current = true;
    if (!getTool("pomodoro-timer")) {
      registerTool("pomodoro-timer", new PomodoroToolExecutor(), {});
    }
  }, [registerTool, getTool]);

  // ── Initialize executor + bridge from the gtd-suite mapping config ────────

  useEffect(() => {
    const cfg = mappingConfig as ToolStoryworldMappingConfig;
    let cancelled = false;

    loadExecutor(cfg.storyworld).then((exec) => {
      if (cancelled) return;
      exec.setCanvasSize(800, 600);
      setExecutor(exec);
      setBridge(new MappingBridge(cfg, exec));
    });

    return () => { cancelled = true; };
  }, []);

  // Connect renderer to executor once both are ready
  useEffect(() => {
    if (executor && rendererRef.current) {
      executor.setRenderer(rendererRef.current);
    }
  }, [executor]);

  // ── Single billboard reflecting the whole task list ────────────────────

  useEffect(() => {
    if (!bridge) return;
    bridge.ensureObject({ id: "todolist-root", title: "Task Board" }, "todolist", undefined, "todo-list");
    void bridge.onToolAction(
      "todolist-root",
      "refresh",
      { content: generateTaskListHtml(tasks, completedTaskIds) },
      "todo-list",
    );
  }, [bridge, tasks, completedTaskIds]);

  // ── Sync pomodoro sessions → crop objects ──────────────────────────────

  const pomodoroState = getTool("pomodoro-timer")?.getState();
  const sessions = pomodoroState
    ? Array.from(pomodoroState.instances.values())
        .filter((inst) => inst.typeName === "Session")
        .map((inst) => {
          const session: { id: string; [key: string]: unknown } = { id: inst.instanceId, ...inst.state };
          const taskId = inst.state.associatedTaskId as string | null;
          if (taskId) {
            const task = tasks.find((t) => t.id === taskId);
            if (task) session.associatedTaskTitle = task.title;
          }
          return session;
        })
    : [];

  useEffect(() => {
    if (!bridge) return;
    bridge.syncObjects(sessions, "sessions", "pomodoro-timer");
  }, [bridge, sessions]);

  // ── Tick active pomodoro session every second ──────────────────────────

  const hasActiveSession = sessions.some((s) => s.status === "active");
  useEffect(() => {
    if (!hasActiveSession) return;

    const interval = setInterval(async () => {
      const toolStore = useToolStore.getState();
      await toolStore.executeAction("pomodoro-timer", "timer-root", "tick", {});
      setTickCount((c) => c + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [hasActiveSession]);

  // ── Redirect if not in a playing state ────────────────────────────────

  useEffect(() => {
    if (phase !== "playing" && phase !== "completed") {
      router.push("/");
    }
  }, [phase, router]);

  // Derive scene / act title
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
      const toolStates = getAllPublicStates();

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

          const extracted = extractStoryText(fullText);
          if (extracted) {
            setStreamingText(extracted);
            const { sentences, endIndex } = splitIntoSentences(extracted);

            if (displayedSentenceCount < sentences.length) {
              rendererRef.current?.streamText(sentences[displayedSentenceCount]);
              rendererRef.current?.commitStreamedText();
              displayedSentenceCount++;

              while (displayedSentenceCount < sentences.length) {
                rendererRef.current?.displayText(
                  sentences[displayedSentenceCount],
                  { waitForClick: true },
                );
                displayedSentenceCount++;
              }
            }

            const partialText = extracted.slice(endIndex).trim();
            if (partialText) {
              rendererRef.current?.streamText(partialText);
            } else if (sentences.length === 0) {
              rendererRef.current?.streamText(extracted);
            }
          }
        }

        // Parse final response
        const storyMatch = fullText.match(/STORY:\s*([\s\S]*?)(?=\nDATA:|$)/);
        const dataMatch = fullText.match(/DATA:\s*({[\s\S]*})/);

        if (storyMatch && dataMatch) {
          const storyText = storyMatch[1].trim();
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

        if (finalResponse?.storyText) {
          // Flush remaining streamed text
          if (rendererRef.current) {
            rendererRef.current.commitStreamedText();
            const { endIndex } = splitIntoSentences(finalResponse.storyText);
            const remaining = finalResponse.storyText.slice(endIndex).trim();
            if (remaining) {
              rendererRef.current.displayText(remaining, { waitForClick: true });
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

          // ── Execute tool calls ──────────────────────────────────────────
          if (finalResponse.toolCalls?.length > 0) {
            const toolStore = useToolStore.getState();

            for (const toolCall of finalResponse.toolCalls) {
              try {
                switch (toolCall.operation) {

                  // ── Pomodoro operations ──────────────────────────────

                  case "startSession": {
                    // Ask user where to plant the crop
                    let cropPosition: { x: number; y: number } | undefined;
                    if (rendererRef.current) {
                      cropPosition = await rendererRef.current.getPositionInput({
                        prompt: "Click to plant your crop",
                        constrainTo: { minX: 60, maxX: 740, minY: 50, maxY: 300 },
                        ghostSpriteId: "seeds",
                      });
                    }

                    const startResult = await toolStore.executeAction(
                      "pomodoro-timer", "timer-root", "startSession",
                      { type: toolCall.params.type ?? "work", taskId: toolCall.params.taskId },
                    );
                    const startOutput = startResult.output as { sessionId?: string } | undefined;
                    if (bridge && startOutput?.sessionId) {
                      bridge.ensureObject(
                        {
                          id: startOutput.sessionId,
                          type: toolCall.params.type ?? "work",
                          title: toolCall.params.type ?? "work",
                          content: toolCall.params.type ?? "work",
                        },
                        "sessions",
                        cropPosition,
                        "pomodoro-timer",
                      );
                      await bridge.onToolAction(
                        startOutput.sessionId,
                        "start",
                        { type: toolCall.params.type ?? "work" },
                        "pomodoro-timer",
                      );
                    }
                    break;
                  }

                  case "pauseSession": {
                    const timerRoot = toolStore.getTool("pomodoro-timer")
                      ?.getState().instances.get("timer-root");
                    const sessionId = timerRoot?.state.currentSessionId as string | null;
                    await toolStore.executeAction("pomodoro-timer", "timer-root", "pauseSession", {});
                    if (bridge && sessionId) {
                      await bridge.onToolAction(sessionId, "pause", {}, "pomodoro-timer");
                    }
                    break;
                  }

                  case "resumeSession": {
                    const timerRoot = toolStore.getTool("pomodoro-timer")
                      ?.getState().instances.get("timer-root");
                    const sessionId = timerRoot?.state.currentSessionId as string | null;
                    await toolStore.executeAction("pomodoro-timer", "timer-root", "resumeSession", {});
                    if (bridge && sessionId) {
                      await bridge.onToolAction(sessionId, "resume", {}, "pomodoro-timer");
                    }
                    break;
                  }

                  case "completeSession": {
                    const timerRoot = toolStore.getTool("pomodoro-timer")
                      ?.getState().instances.get("timer-root");
                    const sessionId = timerRoot?.state.currentSessionId as string | null;
                    await toolStore.executeAction("pomodoro-timer", "timer-root", "completeSession", {});
                    if (bridge && sessionId) {
                      await bridge.onToolAction(sessionId, "complete", {}, "pomodoro-timer");
                    }
                    break;
                  }

                  case "cancelSession": {
                    const timerRoot = toolStore.getTool("pomodoro-timer")
                      ?.getState().instances.get("timer-root");
                    const sessionId = timerRoot?.state.currentSessionId as string | null;
                    await toolStore.executeAction("pomodoro-timer", "timer-root", "cancelSession", {});
                    if (bridge && sessionId) {
                      await bridge.onToolAction(
                        sessionId, "setStatus", { status: "cancelled" }, "pomodoro-timer",
                      );
                    }
                    break;
                  }

                  // ── Todo list operations ─────────────────────────────

                  case "updateTaskStatus": {
                    await toolStore.executeAction(
                      "todo-list", toolCall.params.taskId, "updateStatus",
                      { status: toolCall.params.status },
                    );
                    if (toolCall.params.status === "completed") {
                      completeTask(toolCall.params.taskId);
                    } else if (toolCall.params.status === "cancelled") {
                      skipTask(toolCall.params.taskId);
                    }
                    // Billboard is updated reactively via the tasks useEffect
                    break;
                  }

                  case "addTask": {
                    await toolStore.executeAction(
                      "todo-list", "todolist-root", "createTask",
                      { title: toolCall.params.title, description: toolCall.params.description },
                    );
                    // Billboard refreshes reactively via the tasks useEffect
                    break;
                  }

                  case "deleteTask":
                    await toolStore.executeAction(
                      "todo-list", toolCall.params.taskId, "delete", {},
                    );
                    break;

                  case "reorderTasks":
                    await toolStore.executeAction(
                      "todo-list", "todolist-root", "reorderTasks",
                      { taskIds: toolCall.params.taskIds },
                    );
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
        const errMsg = error instanceof Error ? error.message : String(error);
        const errorEntry: NarrativeEntry = {
          id: `error-${Date.now()}`,
          role: "system",
          content: `The Story Master pauses, gathering their thoughts... (Error: ${errMsg})`,
          timestamp: Date.now(),
          sceneId: currentScene.id,
        };
        addNarrativeEntry(errorEntry);
        setStreamingText("");
        rendererRef.current?.displayText(errorEntry.content, { waitForClick: true });
      } finally {
        setIsStreaming(false);
      }

      // Prompt for the next player input
      if (rendererRef.current && useGameStore.getState().phase === "playing") {
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
      completeTask,
      skipTask,
      getTasks,
      getAllPublicStates,
    ],
  );

  // ── Player action handler ──────────────────────────────────────────────

  const handleActionRef = useRef<(type: string, content: string, taskId?: string) => void>(() => {});

  const handleAction = useCallback(
    async (type: string, content: string, taskId?: string) => {
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

        if (update.completedTaskId) completeTask(update.completedTaskId);
        if (action.type === "skip_task" && taskId) skipTask(taskId);

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
            await toolStore.executeAction("todo-list", u.taskId, "updateStatus", { status: newStatus });
          }
          syncTasksFromTool();
          // Billboard refreshes reactively via the tasks useEffect
        }

        if (update.newSceneId) setCurrentScene(update.newSceneId);
        if (update.newPhase) setPhase(update.newPhase);
        if (update.narrativeEntry) addNarrativeEntry(update.narrativeEntry);

        await handleNarrate(content);
      } catch (error) {
        console.error("Action error:", error);
        const errMsg = error instanceof Error ? error.message : String(error);
        rendererRef.current?.displayText(`Error: ${errMsg}`, { waitForClick: true });
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
          <h1 className="text-2xl font-light text-black tracking-tight">Complete.</h1>
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
      <SceneHeader
        scene={currentScene}
        environment={environment}
        actTitle={currentActTitle}
      />

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 relative overflow-hidden min-h-0">
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
              <StoryWorldRenderer
                ref={rendererRef}
                executor={executor}
                width={800}
                height={600}
              />
            </div>

            {isStreaming && (
              <div className="absolute top-2 left-2 flex items-center gap-2 px-2 py-1 bg-black/60 rounded text-white text-xs font-mono z-10">
                <span className="inline-block w-2 h-2 bg-white rounded-full animate-pulse" />
                Story Master is writing...
              </div>
            )}

            <div className="absolute top-2 right-2 z-10">
              <button
                onClick={() => setShowHistory((v) => !v)}
                className="px-2 py-1 bg-white/80 border border-gray-300 text-gray-500 text-xs rounded hover:bg-white transition-colors font-mono"
              >
                {showHistory ? "Hide History" : "Messages"}
              </button>
            </div>

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

export default function AdventureGTDPage() {
  return (
    <HydrationGate>
      <AdventureGameGTD />
    </HydrationGate>
  );
}
