"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSetupStore } from "@/stores/use-setup-store";
import { useGameStore } from "@/stores/use-game-store";
import type { OptimizedTask } from "@/types/task";
import type { PlotStructure } from "@/types/story";

/** Builds a minimal plot from tasks so adventure/narrator/respond work without the generate-plot API. */
function buildMinimalPlot(tasks: OptimizedTask[]): PlotStructure {
  return {
    title: "Your Quest",
    premise: "A journey through your tasks, one step at a time.",
    acts: [
      {
        actNumber: 1,
        title: "The Journey",
        description: "Complete your tasks in order.",
        scenes: tasks.map((t, i) => ({
          id: `scene-${t.id}`,
          title: t.title,
          description: t.description ?? t.title,
          associatedTaskIds: [t.id],
          metaphor: t.title,
          narrativeHook: `Your next task: ${t.title}`,
          suggestedChoices: ["Continue", "Skip for now"],
          transitionHint: "On to the next task.",
        })),
      },
    ],
  };
}

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
      /*const optimizeRes = await fetch("/api/ai/optimize-tasks", {
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
      );*/


      // Use input tasks as-is (no optimization)
      const optimizedTasks: OptimizedTask[] = tasks.map((t, index) => ({
        ...t,
        originalIndex: index,
        optimizedOrder: index,
        rationale: "",
        questSuggestion: "",
      }));
      setOptimizedTasks(optimizedTasks);

      // Step 2: Generate plot
      /*setStage("plotting");
      const plotRes = await fetch("/api/ai/generate-plot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tasks: optimizedTasks,
          profile,
          storyWorld,
        }),
      });

      const plotData: PlotStructure = await plotRes.json();

      setPlotStructure({
        title: plotData.title,
        premise: plotData.premise,
        acts: plotData.acts,
      });

      if (!plotRes.ok) {
        throw new Error(`Plot generation failed: ${plotRes.statusText}`);
      }*/


      /*setCharacter({
        characterName: plotData.characterName,
        role: plotData.characterRole,
        backstory: plotData.characterBackstory,
        traits: plotData.characterTraits,
        level: 1,
        xp: 0,
      });*/

      // Character stays null; narrator falls back to profile.name

      // Build minimal plot from tasks (no generate-plot API) so adventure page,
      // narrator, respond API, and scene advancement still work.
      const minimalPlot: PlotStructure = buildMinimalPlot(optimizedTasks);
      setPlotStructure(minimalPlot);

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
    <div className="min-h-screen flex flex-col items-center justify-center bg-white p-8">
      <div className="max-w-lg w-full text-center space-y-8">
        {stage === "error" ? (
          <>
            <div className="text-black text-lg font-light">
              Something went wrong.
            </div>
            <p className="text-gray-400 text-sm font-light">{error}</p>
            <p className="text-gray-400 text-xs">
              Make sure you have configured your AI provider API key in the .env
              file.
            </p>
            <button
              onClick={() => {
                setStage("optimizing");
                setError(null);
                runPreparation();
              }}
              className="px-6 py-2 bg-black text-white font-light rounded-none hover:bg-gray-800 transition-colors text-sm tracking-wide"
            >
              Try Again
            </button>
          </>
        ) : (
          <>
            <div className="relative">
              <div className="w-12 h-12 mx-auto border border-gray-300 rounded-full animate-spin border-t-black" />
            </div>
            <div className="space-y-2">
              <p className="text-black text-base font-light animate-pulse">
                {loadingMessages[messageIndex]}
              </p>
              <p className="text-gray-400 text-sm font-light">
                {stage === "optimizing"
                  ? "Optimizing your task order for peak productivity..."
                  : "Generating your unique adventure plot..."}
              </p>
            </div>
            <div className="flex justify-center gap-3">
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  stage === "optimizing"
                    ? "bg-black animate-pulse"
                    : "bg-gray-400"
                }`}
              />
              <div
                className={`w-2 h-2 rounded-full transition-colors ${
                  stage === "plotting"
                    ? "bg-black animate-pulse"
                    : stage === "ready"
                      ? "bg-gray-400"
                      : "bg-gray-200"
                }`}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
