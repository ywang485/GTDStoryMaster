"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { BaseToolExecutor } from "@/lib/tools";
import type { ToolState, ActionResult } from "@/lib/tools";

// ── Interface ───────────────────────────────────────────────────────────────

interface ToolStoreState {
  /** Transient executor instances (not persisted) */
  tools: Record<string, BaseToolExecutor>;

  /** Persisted state snapshots, keyed by tool name */
  toolStates: Record<string, ToolState>;

  /**
   * Register (or re-register) a tool. If persisted state exists for `name`,
   * the executor is restored from it; otherwise `executor.initialize(input)`
   * is called. No-ops if the tool is already registered.
   */
  registerTool: (
    name: string,
    executor: BaseToolExecutor,
    input: unknown,
  ) => Promise<void>;

  /** Remove a tool from the registry and its persisted state. */
  unregisterTool: (name: string) => void;

  /** Get a live executor by tool name (null if not registered). */
  getTool: (name: string) => BaseToolExecutor | null;

  /** Get the persisted state snapshot for a tool (null if not registered). */
  getToolState: (name: string) => ToolState | null;

  /** Generic action dispatch — works with any registered tool. */
  executeAction: (
    toolName: string,
    instanceId: string,
    actionName: string,
    parameters?: Record<string, unknown>,
  ) => Promise<ActionResult>;

  /** Public states for a single tool. */
  getToolPublicStates: (
    toolName: string,
  ) => Record<string, Record<string, unknown>>;

  /** All public states aggregated, keyed by tool name. */
  getAllPublicStates: () => Record<
    string,
    Record<string, Record<string, unknown>>
  >;

  /** Refresh all persisted tool state snapshots from their executors. */
  refreshState: () => void;

  /** Reset one tool (by name) or all tools (no argument). */
  resetTool: (toolName?: string) => Promise<void>;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * When ToolState is deserialized from JSON, `instances` becomes a plain
 * object instead of a Map. This restores it.
 */
function rehydrateToolState(raw: ToolState): ToolState {
  const state = { ...raw };
  if (state.instances && !(state.instances instanceof Map)) {
    state.instances = new Map(Object.entries(state.instances));
  }
  return state;
}

// ── Store ───────────────────────────────────────────────────────────────────

export const useToolStore = create<ToolStoreState>()(
  persist(
    (set, get) => ({
      tools: {},
      toolStates: {},

      registerTool: async (name, executor, input) => {
        // Short-circuit if already registered
        if (get().tools[name]) return;

        const existing = get().toolStates[name];
        if (existing) {
          // Restore executor from persisted state
          (executor as any).state = rehydrateToolState(existing);
        } else {
          // Fresh initialization
          await executor.initialize(input);
        }

        set((prev) => ({
          tools: { ...prev.tools, [name]: executor },
          toolStates: { ...prev.toolStates, [name]: executor.getState() },
        }));
      },

      unregisterTool: (name) => {
        set((prev) => {
          const { [name]: _tool, ...restTools } = prev.tools;
          const { [name]: _state, ...restStates } = prev.toolStates;
          return { tools: restTools, toolStates: restStates };
        });
      },

      getTool: (name) => get().tools[name] ?? null,

      getToolState: (name) => get().toolStates[name] ?? null,

      executeAction: async (toolName, instanceId, actionName, parameters = {}) => {
        const tool = get().tools[toolName];
        if (!tool) {
          throw new Error(`Tool "${toolName}" not registered`);
        }

        const result = await tool.executeAction({
          instanceId,
          actionName,
          parameters,
          timestamp: new Date(),
        });

        // Refresh this tool's state snapshot
        set((prev) => ({
          toolStates: {
            ...prev.toolStates,
            [toolName]: tool.getState(),
          },
        }));

        return result;
      },

      getToolPublicStates: (toolName) => {
        const tool = get().tools[toolName];
        if (!tool) return {};
        return tool.exportPublicStates();
      },

      getAllPublicStates: () => {
        const { tools } = get();
        const result: Record<string, Record<string, Record<string, unknown>>> = {};
        for (const [name, tool] of Object.entries(tools)) {
          result[name] = tool.exportPublicStates();
        }
        return result;
      },

      refreshState: () => {
        const { tools } = get();
        const updates: Record<string, ToolState> = {};
        for (const [name, tool] of Object.entries(tools)) {
          updates[name] = tool.getState();
        }
        set((prev) => ({
          toolStates: { ...prev.toolStates, ...updates },
        }));
      },

      resetTool: async (toolName) => {
        const { tools } = get();
        if (toolName) {
          const tool = tools[toolName];
          if (tool) {
            await tool.reset();
            set((prev) => ({
              toolStates: {
                ...prev.toolStates,
                [toolName]: tool.getState(),
              },
            }));
          }
        } else {
          for (const tool of Object.values(tools)) {
            await tool.reset();
          }
          get().refreshState();
        }
      },
    }),
    {
      name: "gtd-tool-store",
      partialize: (state) => ({
        toolStates: state.toolStates,
      }),
      // Migrate from the old per-tool format (todoListState / pomodoroState)
      merge: (persisted: any, current) => {
        const toolStates: Record<string, ToolState> =
          persisted?.toolStates ?? {};

        // Migrate old flat fields if present
        if (persisted?.todoListState && !toolStates["todo-list"]) {
          toolStates["todo-list"] = persisted.todoListState;
        }
        if (persisted?.pomodoroState && !toolStates["pomodoro-timer"]) {
          toolStates["pomodoro-timer"] = persisted.pomodoroState;
        }

        return { ...current, toolStates };
      },
    },
  ),
);
