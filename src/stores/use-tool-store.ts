"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  TodoListToolExecutor,
  todoListToolDefinition,
  type ToolState,
  type ActionResult
} from "@/lib/tools";

interface ToolStoreState {
  // Todo list tool instance
  todoListTool: TodoListToolExecutor | null;
  todoListState: ToolState | null;

  // Initialization
  initializeTodoList: (initialTasks?: Array<{
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high" | "critical";
    estimatedMinutes?: number;
    tags?: string[];
  }>) => Promise<void>;

  // Task operations
  createTask: (params: {
    title: string;
    description?: string;
    priority?: "low" | "medium" | "high" | "critical";
    estimatedMinutes?: number;
    tags?: string[];
    dependencies?: string[];
  }) => Promise<ActionResult>;

  updateTaskStatus: (taskId: string, status: "pending" | "in_progress" | "completed" | "blocked" | "cancelled", actualMinutes?: number) => Promise<ActionResult>;

  updateTaskDetails: (taskId: string, updates: {
    title?: string;
    description?: string;
    priority?: "low" | "medium" | "high" | "critical";
    estimatedMinutes?: number;
    tags?: string[];
  }) => Promise<ActionResult>;

  deleteTask: (taskId: string) => Promise<ActionResult>;

  reorderTasks: (taskIds: string[]) => Promise<ActionResult>;

  clearCompleted: (archive?: boolean) => Promise<ActionResult>;

  getStats: () => Promise<ActionResult>;

  configureTodoList: (config: {
    autoArchiveCompleted?: boolean;
    defaultPriority?: "low" | "medium" | "high" | "critical";
    enableDependencies?: boolean;
    maxActiveTasks?: number;
  }) => Promise<ActionResult>;

  // State access
  refreshState: () => void;
  getPublicStates: () => Record<string, Record<string, unknown>>;
  getTodoListRootId: () => string;

  // Reset
  resetTool: () => Promise<void>;
}

export const useToolStore = create<ToolStoreState>()(
  persist(
    (set, get) => ({
      todoListTool: null,
      todoListState: null,

      initializeTodoList: async (initialTasks) => {
        const tool = new TodoListToolExecutor();

        const state = await tool.initialize({
          config: {
            autoArchiveCompleted: false,
            defaultPriority: "medium",
            enableDependencies: true
          },
          initialTasks: initialTasks ?? []
        });

        set({
          todoListTool: tool,
          todoListState: state
        });
      },

      createTask: async (params) => {
        const { todoListTool } = get();
        if (!todoListTool) {
          throw new Error("Todo list tool not initialized");
        }

        const result = await todoListTool.executeAction({
          instanceId: "todolist-root",
          actionName: "createTask",
          parameters: params,
          timestamp: new Date()
        });

        // Refresh state
        get().refreshState();

        return result;
      },

      updateTaskStatus: async (taskId, status, actualMinutes) => {
        const { todoListTool } = get();
        if (!todoListTool) {
          throw new Error("Todo list tool not initialized");
        }

        const result = await todoListTool.executeAction({
          instanceId: taskId,
          actionName: "updateStatus",
          parameters: {
            status,
            ...(actualMinutes !== undefined && { actualMinutes })
          },
          timestamp: new Date()
        });

        // Refresh state
        get().refreshState();

        return result;
      },

      updateTaskDetails: async (taskId, updates) => {
        const { todoListTool } = get();
        if (!todoListTool) {
          throw new Error("Todo list tool not initialized");
        }

        const result = await todoListTool.executeAction({
          instanceId: taskId,
          actionName: "updateDetails",
          parameters: updates,
          timestamp: new Date()
        });

        // Refresh state
        get().refreshState();

        return result;
      },

      deleteTask: async (taskId) => {
        const { todoListTool } = get();
        if (!todoListTool) {
          throw new Error("Todo list tool not initialized");
        }

        const result = await todoListTool.executeAction({
          instanceId: taskId,
          actionName: "delete",
          parameters: {},
          timestamp: new Date()
        });

        // Refresh state
        get().refreshState();

        return result;
      },

      reorderTasks: async (taskIds) => {
        const { todoListTool } = get();
        if (!todoListTool) {
          throw new Error("Todo list tool not initialized");
        }

        const result = await todoListTool.executeAction({
          instanceId: "todolist-root",
          actionName: "reorderTasks",
          parameters: { taskIds },
          timestamp: new Date()
        });

        // Refresh state
        get().refreshState();

        return result;
      },

      clearCompleted: async (archive = true) => {
        const { todoListTool } = get();
        if (!todoListTool) {
          throw new Error("Todo list tool not initialized");
        }

        const result = await todoListTool.executeAction({
          instanceId: "todolist-root",
          actionName: "clearCompleted",
          parameters: { archive },
          timestamp: new Date()
        });

        // Refresh state
        get().refreshState();

        return result;
      },

      getStats: async () => {
        const { todoListTool } = get();
        if (!todoListTool) {
          throw new Error("Todo list tool not initialized");
        }

        const result = await todoListTool.executeAction({
          instanceId: "todolist-root",
          actionName: "getStats",
          parameters: {},
          timestamp: new Date()
        });

        return result;
      },

      configureTodoList: async (config) => {
        const { todoListTool } = get();
        if (!todoListTool) {
          throw new Error("Todo list tool not initialized");
        }

        const result = await todoListTool.executeAction({
          instanceId: "todolist-root",
          actionName: "configure",
          parameters: { config },
          timestamp: new Date()
        });

        // Refresh state
        get().refreshState();

        return result;
      },

      refreshState: () => {
        const { todoListTool } = get();
        if (todoListTool) {
          set({ todoListState: todoListTool.getState() });
        }
      },

      getPublicStates: () => {
        const { todoListTool } = get();
        if (!todoListTool) {
          return {};
        }
        return todoListTool.exportPublicStates();
      },

      getTodoListRootId: () => "todolist-root",

      resetTool: async () => {
        const { todoListTool } = get();
        if (todoListTool) {
          await todoListTool.reset();
          get().refreshState();
        }
      }
    }),
    {
      name: "gtd-tool-store",
      // Don't persist the tool instance itself, only the state
      partialize: (state) => ({
        todoListState: state.todoListState
      }),
      // Rehydrate the tool instance from persisted state
      onRehydrateStorage: () => (state) => {
        if (state && state.todoListState) {
          const tool = new TodoListToolExecutor();
          // Restore tool state from persisted data
          (tool as any).state = state.todoListState;
          state.todoListTool = tool;
        }
      }
    }
  )
);
