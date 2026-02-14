/**
 * Mapping Bridge
 *
 * Interprets a tool-storyworld mapping configuration at runtime.
 * Resolves object mappings (tool objects → storyworld objects) and
 * action mappings (tool actions → storyworld actions) so the adventure
 * page stays free of storyworld-specific logic.
 */

import type { BaseStoryWorldExecutor, ActionResult } from "@/lib/storyworld";

// ── Mapping config JSON shape ──────────────────────────────────────────────

export interface ObjectMapping {
  source: string;
  target: string;
  initial_state: Record<string, unknown> | unknown[];
}

export interface ActionMappingCondition {
  param: string;
  equals: string;
}

export interface ActionMapping {
  source_action: string;
  type: "toolAction" | "UIAction";
  condition?: ActionMappingCondition;
  target_action: string;
  target_params: Array<{ source: string; target: string }> | unknown[];
}

export interface MetadataMapping {
  task_field: string;
  crop_field: string;
  transform: string;
  max_length?: number;
}

export interface ToolStoryworldMappingConfig {
  mapping_name: string;
  description: string;
  version: string;
  tool: string;
  storyworld: string;
  mappings: {
    object_mappings: ObjectMapping[];
    action_mappings: ActionMapping[];
    metadata_mapping: MetadataMapping[];
  };
}

// ── Transform helpers ──────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + "…";
}

function applyTransform(
  value: unknown,
  transform: string,
  maxLength?: number,
): unknown {
  const str = String(value);
  switch (transform) {
    case "slugify":
      return slugify(str);
    case "truncate":
      return truncate(str, maxLength ?? 30);
    default:
      return str;
  }
}

// ── Bridge class ───────────────────────────────────────────────────────────

export class MappingBridge {
  readonly config: ToolStoryworldMappingConfig;
  private executor: BaseStoryWorldExecutor;
  /** Maps tool task ID → storyworld object ID */
  private taskObjectMap = new Map<string, string>();

  constructor(
    config: ToolStoryworldMappingConfig,
    executor: BaseStoryWorldExecutor,
  ) {
    this.config = config;
    this.executor = executor;
  }

  // ── Object lifecycle ───────────────────────────────────────────────────

  /**
   * Resolve the target object type for a given source collection name.
   * e.g. "tasks" → the first object_mapping whose source is "tasks".
   */
  private getObjectMapping(sourceCollection: string): ObjectMapping | undefined {
    return this.config.mappings.object_mappings.find(
      (m) => m.source === sourceCollection,
    );
  }

  /**
   * Build the initial state for a new storyworld object from the mapping
   * config's `initial_state` field, plus any metadata transformations.
   */
  private buildInitialState(
    task: { id: string; title?: string; content?: string },
    mapping: ObjectMapping,
  ): Record<string, unknown> {
    const state: Record<string, unknown> = {};

    // Apply initial_state from config (only if it's an object, not an empty array)
    if (
      mapping.initial_state &&
      !Array.isArray(mapping.initial_state) &&
      typeof mapping.initial_state === "object"
    ) {
      Object.assign(state, mapping.initial_state);
    }

    // Apply metadata mappings (task fields → storyworld object fields)
    for (const meta of this.config.mappings.metadata_mapping) {
      const taskRecord = task as Record<string, unknown>;
      const sourceValue = taskRecord[meta.task_field] ?? task.title;
      if (sourceValue !== undefined) {
        state[meta.crop_field] = applyTransform(
          sourceValue,
          meta.transform,
          meta.max_length,
        );
      }
    }

    return state;
  }

  /**
   * Ensure a storyworld object exists for the given task.
   * Creates one via `executor.createObject` if it doesn't exist yet.
   * Returns the storyworld object ID.
   */
  ensureObjectForTask(
    task: { id: string; title?: string; content?: string },
  ): string | null {
    // Already tracked?
    const existing = this.taskObjectMap.get(task.id);
    if (existing) return existing;

    const objectMapping = this.getObjectMapping("tasks");
    if (!objectMapping) return null;

    const targetTypeId = objectMapping.target === "crops" ? "crop" : objectMapping.target;

    // Derive a stable storyworld ID from task metadata
    const label = task.title ?? task.content ?? task.id;
    const objectId = slugify(label) || task.id;

    // Don't recreate if the executor already has it (page remount)
    if (this.executor.getObject(objectId)) {
      this.taskObjectMap.set(task.id, objectId);
      return objectId;
    }

    const initialState = this.buildInitialState(
      { ...task, content: label },
      objectMapping,
    );

    const result = this.executor.createObject(targetTypeId, objectId, initialState);
    if (result.success) {
      this.taskObjectMap.set(task.id, objectId);
      return objectId;
    }

    return null;
  }

  /**
   * Sync a full list of tasks — creates storyworld objects for any tasks
   * that don't yet have a corresponding object.
   */
  syncTasks(
    tasks: Array<{ id: string; title?: string; content?: string }>,
  ): void {
    for (const task of tasks) {
      this.ensureObjectForTask(task);
    }
  }

  // ── Action dispatch ────────────────────────────────────────────────────

  /**
   * Find matching action mappings for a tool action + its params.
   */
  private findActionMappings(
    sourceAction: string,
    type: "toolAction" | "UIAction",
    params?: Record<string, unknown>,
  ): ActionMapping[] {
    return this.config.mappings.action_mappings.filter((m) => {
      if (m.source_action !== sourceAction) return false;
      if (m.type !== type) return false;
      if (m.condition) {
        const paramValue = params?.[m.condition.param];
        if (String(paramValue) !== m.condition.equals) return false;
      }
      return true;
    });
  }

  /**
   * Execute a tool action and propagate it to the storyworld via mappings.
   *
   * @param taskId       The tool-side task ID
   * @param sourceAction The tool action name (e.g. "updateStatus")
   * @param params       The tool action parameters (e.g. { status: "completed" })
   */
  async onToolAction(
    taskId: string,
    sourceAction: string,
    params?: Record<string, unknown>,
  ): Promise<ActionResult[]> {
    const objectId = this.taskObjectMap.get(taskId);
    if (!objectId) return [];

    const mappings = this.findActionMappings(sourceAction, "toolAction", params);
    const results: ActionResult[] = [];

    for (const mapping of mappings) {
      const targetParams: Record<string, unknown> = {};
      if (Array.isArray(mapping.target_params)) {
        for (const p of mapping.target_params) {
          if (typeof p === "object" && p !== null && "source" in p && "target" in p) {
            const pm = p as { source: string; target: string };
            targetParams[pm.target] = params?.[pm.source];
          }
        }
      }

      const result = await this.executor.executeAction(
        objectId,
        mapping.target_action,
        targetParams,
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Handle a UI action (e.g. clicking an object in the canvas).
   */
  async onUIAction(
    storyworldObjectId: string,
    sourceAction: string,
  ): Promise<ActionResult[]> {
    const mappings = this.findActionMappings(sourceAction, "UIAction");
    const results: ActionResult[] = [];

    for (const mapping of mappings) {
      const result = await this.executor.executeAction(
        storyworldObjectId,
        mapping.target_action,
      );
      results.push(result);
    }

    return results;
  }

  /**
   * Get the storyworld object ID for a given task ID.
   */
  getObjectIdForTask(taskId: string): string | undefined {
    return this.taskObjectMap.get(taskId);
  }

  /**
   * Get the task ID for a given storyworld object ID (reverse lookup).
   */
  getTaskIdForObject(objectId: string): string | undefined {
    for (const [taskId, objId] of this.taskObjectMap) {
      if (objId === objectId) return taskId;
    }
    return undefined;
  }
}
