"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GamePhase, EnvironmentContext } from "@/types/game";
import type { Task, OptimizedTask } from "@/types/task";
import type { PlotStructure, NarrativeEntry } from "@/types/story";
import type { CharacterSheet } from "@/types/player";

interface GameState {
  phase: GamePhase;
  optimizedTasks: OptimizedTask[] | null;
  plotStructure: PlotStructure | null;
  character: CharacterSheet | null;
  narrativeLog: NarrativeEntry[];
  completedTaskIds: string[];
  turnCount: number;
  currentSceneId: string | null;
  environment: EnvironmentContext;
  tasks: Task[];

  // Actions
  setPhase: (phase: GamePhase) => void;
  setOptimizedTasks: (tasks: OptimizedTask[]) => void;
  setPlotStructure: (plot: PlotStructure) => void;
  setCharacter: (character: CharacterSheet) => void;
  setTasks: (tasks: Task[]) => void;
  reorderTasks: (taskIds: string[]) => void;
  addNarrativeEntry: (entry: NarrativeEntry) => void;
  completeTask: (taskId: string) => void;
  skipTask: (taskId: string) => void;
  updateTaskStatus: (taskId: string, status: Task["status"]) => void;
  setCurrentScene: (sceneId: string) => void;
  incrementTurn: () => void;
  setEnvironment: (env: Partial<EnvironmentContext>) => void;
  resetGame: () => void;
}

const defaultEnvironment: EnvironmentContext = {
  currentTime: new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }),
};

export const useGameStore = create<GameState>()(
  persist(
    (set) => ({
      phase: "setup",
      optimizedTasks: null,
      plotStructure: null,
      character: null,
      narrativeLog: [],
      completedTaskIds: [],
      turnCount: 0,
      currentSceneId: null,
      environment: defaultEnvironment,
      tasks: [],

      setPhase: (phase) => set({ phase }),

      setOptimizedTasks: (tasks) => set({ optimizedTasks: tasks }),

      setPlotStructure: (plot) => {
        const firstScene = plot.acts[0]?.scenes[0];
        set({
          plotStructure: plot,
          currentSceneId: firstScene?.id ?? null,
        });
      },

      setCharacter: (character) => set({ character }),

      setTasks: (tasks) => set({ tasks }),

      reorderTasks: (taskIds) =>
        set((state) => {
          // Create a map of task ID to task for quick lookup
          const taskMap = new Map(state.tasks.map((t) => [t.id, t]));

          // Reorder tasks based on the provided taskIds array
          const reorderedTasks: Task[] = [];
          const usedIds = new Set<string>();

          // Add tasks in the specified order
          for (const id of taskIds) {
            const task = taskMap.get(id);
            if (task) {
              reorderedTasks.push(task);
              usedIds.add(id);
            }
          }

          // Add any remaining tasks that weren't in the taskIds array
          for (const task of state.tasks) {
            if (!usedIds.has(task.id)) {
              reorderedTasks.push(task);
            }
          }

          return { tasks: reorderedTasks };
        }),

      addNarrativeEntry: (entry) =>
        set((state) => ({
          narrativeLog: [...state.narrativeLog, entry],
        })),

      completeTask: (taskId) =>
        set((state) => ({
          completedTaskIds: [...new Set([...state.completedTaskIds, taskId])],
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, status: "completed" as const } : t,
          ),
        })),

      skipTask: (taskId) =>
        set((state) => ({
          completedTaskIds: [...new Set([...state.completedTaskIds, taskId])],
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, status: "skipped" as const } : t,
          ),
        })),

      updateTaskStatus: (taskId, status) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId ? { ...t, status } : t,
          ),
        })),

      setCurrentScene: (sceneId) => set({ currentSceneId: sceneId }),

      incrementTurn: () =>
        set((state) => ({ turnCount: state.turnCount + 1 })),

      setEnvironment: (env) =>
        set((state) => ({
          environment: { ...state.environment, ...env },
        })),

      resetGame: () =>
        set({
          phase: "setup",
          optimizedTasks: null,
          plotStructure: null,
          character: null,
          narrativeLog: [],
          completedTaskIds: [],
          turnCount: 0,
          currentSceneId: null,
          environment: defaultEnvironment,
          tasks: [],
        }),
    }),
    {
      name: "gtd-game-store",
    },
  ),
);
