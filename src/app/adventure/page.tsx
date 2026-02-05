"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGameStore } from "@/stores/use-game-store";
import { useSetupStore } from "@/stores/use-setup-store";
import { useUIStore } from "@/stores/use-ui-store";
import { HydrationGate } from "@/components/providers/hydration-gate";
import { NarrativeViewport } from "@/components/game/narrative-viewport";
import { QuestSidebar } from "@/components/game/quest-sidebar";
import { ActionBar } from "@/components/game/action-bar";
import { SceneHeader } from "@/components/game/scene-header";
import { getCurrentScene, getActiveTask } from "@/lib/engine/quest-tracker";
import { processAction } from "@/lib/engine/game-manager";
import { buildTurnContext, getCurrentEnvironment } from "@/lib/engine/context-builder";
import type { NarrativeEntry } from "@/types/story";

function AdventureGame() {
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
    updateTaskStatus,
    setCurrentScene,
    incrementTurn,
    setEnvironment,
    setPhase,
  } = useGameStore();

  const { profile, storyWorld } = useSetupStore();
  const { isStreaming, setIsStreaming, sidebarOpen } = useUIStore();
  const [streamingText, setStreamingText] = useState("");

  // Redirect if not in playing state
  useEffect(() => {
    if (phase !== "playing" && phase !== "completed") {
      router.push("/");
    }
  }, [phase, router]);

  // Derive current scene and active task
  const currentScene = plotStructure
    ? getCurrentScene(plotStructure, completedTaskIds)
    : null;

  const activeTask = currentScene
    ? getActiveTask(tasks, currentScene, completedTaskIds)
    : null;

  // Get act title for current scene
  const currentActTitle = plotStructure
    ? plotStructure.acts.find((act) =>
        act.scenes.some((s) => s.id === currentSceneId),
      )?.title
    : undefined;

  // Initial narration on first load
  useEffect(() => {
    if (
      plotStructure &&
      currentScene &&
      narrativeLog.length === 0 &&
      !isStreaming
    ) {
      handleNarrate("begin the adventure");
    }
    // Only run on first mount when there's no narrative yet
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plotStructure, currentScene]);

  const handleNarrate = useCallback(
    async (playerInput: string) => {
      if (!plotStructure || !currentScene || !storyWorld || isStreaming) return;

      setIsStreaming(true);
      setStreamingText("");

      const env = getCurrentEnvironment(environment.mood, environment.weather);
      setEnvironment(env);

      const turnContext = buildTurnContext({
        turnNumber: turnCount + 1,
        currentScene,
        tasks,
        narrativeLog,
        playerInput,
        environment: env,
      });

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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullText += chunk;
          setStreamingText(fullText);
        }

        // Add to narrative log
        const narratorEntry: NarrativeEntry = {
          id: `narrator-${Date.now()}`,
          role: "narrator",
          content: fullText,
          timestamp: Date.now(),
          sceneId: currentScene.id,
        };
        addNarrativeEntry(narratorEntry);
        incrementTurn();
        setStreamingText("");
      } catch (error) {
        console.error("Narration error:", error);
        const errorEntry: NarrativeEntry = {
          id: `error-${Date.now()}`,
          role: "system",
          content:
            "The Story Master pauses, gathering their thoughts... (Connection error. Please try again.)",
          timestamp: Date.now(),
          sceneId: currentScene.id,
        };
        addNarrativeEntry(errorEntry);
        setStreamingText("");
      } finally {
        setIsStreaming(false);
      }
    },
    [
      plotStructure,
      currentScene,
      storyWorld,
      isStreaming,
      turnCount,
      tasks,
      narrativeLog,
      environment,
      profile,
      character,
      setIsStreaming,
      setEnvironment,
      addNarrativeEntry,
      incrementTurn,
    ],
  );

  const handleAction = useCallback(
    async (type: string, content: string, taskId?: string) => {
      if (!plotStructure || !currentScene || isStreaming) return;

      const action = {
        type: type as "choice" | "freetext" | "complete_task" | "skip_task",
        content,
        sceneId: currentScene.id,
        taskId,
      };

      // Process game state changes
      const update = processAction(
        action,
        tasks,
        completedTaskIds,
        plotStructure,
        turnCount,
      );

      // Apply state updates
      if (update.completedTaskId) {
        completeTask(update.completedTaskId);
      }

      if (action.type === "skip_task" && taskId) {
        skipTask(taskId);
      }

      if (update.taskStatusUpdates) {
        for (const u of update.taskStatusUpdates) {
          updateTaskStatus(u.taskId, u.status);
        }
      }

      if (update.newSceneId) {
        setCurrentScene(update.newSceneId);
      }

      if (update.newPhase) {
        setPhase(update.newPhase);
      }

      // Add player entry
      if (update.narrativeEntry) {
        addNarrativeEntry(update.narrativeEntry);
      }

      // Get AI narration for the action
      await handleNarrate(content);
    },
    [
      plotStructure,
      currentScene,
      isStreaming,
      tasks,
      completedTaskIds,
      turnCount,
      completeTask,
      skipTask,
      updateTaskStatus,
      setCurrentScene,
      setPhase,
      addNarrativeEntry,
      handleNarrate,
    ],
  );

  if (!plotStructure || phase === "setup") {
    return null;
  }

  if (phase === "completed") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 p-8">
        <div className="max-w-lg text-center space-y-6">
          <h1 className="text-3xl font-bold text-amber-400">
            Quest Complete!
          </h1>
          <p className="text-gray-300 leading-relaxed">
            You have completed all your tasks and reached the end of today&apos;s
            adventure. The Story Master bows with respect.
          </p>
          <div className="text-gray-400 text-sm">
            {completedTaskIds.length} tasks completed across {turnCount} turns
          </div>
          <button
            onClick={() => {
              useGameStore.getState().resetGame();
              router.push("/");
            }}
            className="px-6 py-3 bg-amber-600 text-gray-950 font-bold rounded hover:bg-amber-500 transition-colors"
          >
            Begin a New Adventure
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-950">
      {/* Scene Header */}
      <SceneHeader
        scene={currentScene}
        environment={environment}
        actTitle={currentActTitle}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Narrative Area */}
        <div className="flex-1 flex flex-col">
          <NarrativeViewport
            entries={narrativeLog}
            streamingText={streamingText}
          />
          <ActionBar
            currentScene={currentScene}
            activeTask={activeTask}
            isStreaming={isStreaming}
            onAction={handleAction}
          />
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

export default function AdventurePage() {
  return (
    <HydrationGate>
      <AdventureGame />
    </HydrationGate>
  );
}
