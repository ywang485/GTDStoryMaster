"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { GamePhase, EnvironmentContext } from "@/types/game";
import type { Task, OptimizedTask } from "@/types/task";
import type { PlotStructure, NarrativeEntry } from "@/types/story";
import type { CharacterSheet } from "@/types/player";
import { useToolStore } from "./use-tool-store";
import { getOrderedTasksFromTool } from "@/lib/tools";

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
  tasks: Task[]; // Cached tasks from tool for performance

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
  getTasks: () => Task[]; // Get tasks from tool
  syncTasksFromTool: () => void; // Sync tasks from tool to local cache
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
    (set, get) => ({
      phase: "setup",
      optimizedTasks: null,
      plotStructure: null,
      character: null,
      narrativeLog: [],
      completedTaskIds: [],
      turnCount: 0,
      currentSceneId: null,
      environment: defaultEnvironment,
      tasks: [], // Cached from tool

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

      reorderTasks: async (taskIds) => {
        const toolStore = useToolStore.getState();
        await toolStore.reorderTasks(taskIds);
        get().syncTasksFromTool();
      },

      addNarrativeEntry: (entry) =>
        set((state) => ({
          narrativeLog: [...state.narrativeLog, entry],
        })),

      completeTask: async (taskId) => {
        const toolStore = useToolStore.getState();
        await toolStore.updateTaskStatus(taskId, "completed");
        get().syncTasksFromTool();

        // Update completedTaskIds for backwards compatibility
        set((state) => ({
          completedTaskIds: [...new Set([...state.completedTaskIds, taskId])],
        }));
      },

      skipTask: async (taskId) => {
        const toolStore = useToolStore.getState();
        await toolStore.updateTaskStatus(taskId, "cancelled");
        get().syncTasksFromTool();

        // Update completedTaskIds for backwards compatibility
        set((state) => ({
          completedTaskIds: [...new Set([...state.completedTaskIds, taskId])],
        }));
      },

      updateTaskStatus: async (taskId, status) => {
        const toolStore = useToolStore.getState();
        // Map old status to new status
        const newStatus =
          status === "active"
            ? "in_progress"
            : status === "skipped"
              ? "cancelled"
              : status === "completed"
                ? "completed"
                : "pending";
        await toolStore.updateTaskStatus(taskId, newStatus);
        get().syncTasksFromTool();
      },

      setCurrentScene: (sceneId) => set({ currentSceneId: sceneId }),

      incrementTurn: () =>
        set((state) => ({ turnCount: state.turnCount + 1 })),

      setEnvironment: (env) =>
        set((state) => ({
          environment: { ...state.environment, ...env },
        })),

      resetGame: async () => {
        // Reset tool
        const toolStore = useToolStore.getState();
        await toolStore.resetTool();

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
        });
      },

      getTasks: () => {
        const toolStore = useToolStore.getState();
        if (toolStore.todoListState) {
          return getOrderedTasksFromTool(toolStore.todoListState.instances);
        }
        // Fallback to cached tasks if tool not initialized
        return get().tasks;
      },

      syncTasksFromTool: () => {
        const toolStore = useToolStore.getState();
        if (toolStore.todoListState) {
          const tasks = getOrderedTasksFromTool(toolStore.todoListState.instances);
          set({ tasks });
        }
      },
    }),
    {
      name: "gtd-game-store",
    },
  ),
);
