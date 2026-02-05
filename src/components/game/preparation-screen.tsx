"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSetupStore } from "@/stores/use-setup-store";
import { useGameStore } from "@/stores/use-game-store";
import type { OptimizedTask } from "@/types/task";
import type { PlotStructureResponse } from "@/lib/ai/schemas/plot-structure";
import type { OptimizedTasksResponse } from "@/lib/ai/schemas/optimized-tasks";

const loadingMessages = [
  "The oracle is reading your fate...",
  "Consulting the ancient scrolls of productivity...",
  "Weaving your tasks into the tapestry of destiny...",
  "Summoning the Story Master...",
  "Aligning the stars of your schedule...",
  "Crafting a tale worthy of your quests...",
];

export function PreparationScreen() {
  const router = useRouter();
  const { profile, storyWorld, tasks } = useSetupStore();
  const {
    setPhase,
    setOptimizedTasks,
    setPlotStructure,
    setCharacter,
    setTasks,
  } = useGameStore();

  const [stage, setStage] = useState<
    "optimizing" | "plotting" | "ready" | "error"
  >("optimizing");
  const [messageIndex, setMessageIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex((i) => (i + 1) % loadingMessages.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const runPreparation = useCallback(async () => {
    if (!storyWorld || tasks.length === 0) return;

    try {
      // Step 1: Optimize tasks
      setStage("optimizing");
      const optimizeRes = await fetch("/api/ai/optimize-tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks, profile, storyWorld }),
      });

      if (!optimizeRes.ok) {
        throw new Error(`Task optimization failed: ${optimizeRes.statusText}`);
      }

      const optimizedData: OptimizedTasksResponse = await optimizeRes.json();

      const optimizedTasks: OptimizedTask[] = optimizedData.orderedTasks.map(
        (ot, index) => {
          const original = tasks.find((t) => t.id === ot.taskId) ?? tasks[index];
          return {
            ...original,
            id: ot.taskId || original.id,
            title: ot.title || original.title,
            originalIndex: index,
            optimizedOrder: ot.optimizedOrder,
            rationale: ot.rationale,
            questSuggestion: ot.questSuggestion,
            estimatedMinutes: ot.estimatedMinutes,
          };
        },
      );

      setOptimizedTasks(optimizedTasks);

      // Step 2: Generate plot
      setStage("plotting");
      const plotRes = await fetch("/api/ai/generate-plot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: optimizedTasks,
          profile,
          storyWorld,
        }),
      });

      if (!plotRes.ok) {
        throw new Error(`Plot generation failed: ${plotRes.statusText}`);
      }

      const plotData: PlotStructureResponse = await plotRes.json();

      setPlotStructure({
        title: plotData.title,
        premise: plotData.premise,
        acts: plotData.acts,
      });

      setCharacter({
        characterName: plotData.characterName,
        role: plotData.characterRole,
        backstory: plotData.characterBackstory,
        traits: plotData.characterTraits,
        level: 1,
        xp: 0,
      });

      // Set up game tasks with first one active
      const gameTasks = optimizedTasks.map((t, i) => ({
        ...t,
        status: i === 0 ? ("active" as const) : ("pending" as const),
      }));
      setTasks(gameTasks);

      setPhase("playing");
      setStage("ready");

      // Navigate to play
      router.push("/adventure");
    } catch (err) {
      console.error("Preparation failed:", err);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setStage("error");
    }
  }, [
    storyWorld,
    tasks,
    profile,
    setOptimizedTasks,
    setPlotStructure,
    setCharacter,
    setTasks,
    setPhase,
    router,
  ]);

  useEffect(() => {
    runPreparation();
  }, [runPreparation]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 p-8">
      <div className="max-w-lg w-full text-center space-y-8">
        {stage === "error" ? (
          <>
            <div className="text-red-400 text-lg font-medium">
              The ritual was interrupted...
            </div>
            <p className="text-gray-400 text-sm">{error}</p>
            <p className="text-gray-500 text-xs">
              Make sure you have configured your AI provider API key in the .env
              file.
            </p>
            <button
              onClick={() => {
                setStage("optimizing");
                setError(null);
                runPreparation();
              }}
              className="px-6 py-2 bg-amber-600 text-gray-950 font-medium rounded hover:bg-amber-500 transition-colors"
            >
              Try Again
            </button>
          </>
        ) : (
          <>
            <div className="relative">
              <div className="w-16 h-16 mx-auto border-2 border-amber-500/30 rounded-full animate-spin border-t-amber-500" />
            </div>
            <div className="space-y-2">
              <p className="text-amber-400 text-lg font-medium animate-pulse">
                {loadingMessages[messageIndex]}
              </p>
              <p className="text-gray-500 text-sm">
                {stage === "optimizing"
                  ? "Optimizing your task order for peak productivity..."
                  : "Generating your unique adventure plot..."}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <div
                className={`w-3 h-3 rounded-full transition-colors ${
                  stage === "optimizing"
                    ? "bg-amber-500 animate-pulse"
                    : "bg-green-500"
                }`}
              />
              <div
                className={`w-3 h-3 rounded-full transition-colors ${
                  stage === "plotting"
                    ? "bg-amber-500 animate-pulse"
                    : stage === "ready"
                      ? "bg-green-500"
                      : "bg-gray-700"
                }`}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
