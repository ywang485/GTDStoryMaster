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
  /** Generic source field name (preferred) */
  source_field?: string;
  /** Generic target field name (preferred) */
  target_field?: string;
  /** @deprecated Use source_field instead */
  task_field?: string;
  /** @deprecated Use target_field instead */
  crop_field?: string;
  transform: string;
  max_length?: number;
}

export interface LabelTemplateField {
  source_field: string;
  fallback_field?: string;
  transform?: string;
}

export interface LabelTemplate {
  target_field: string;
  format: string;
  fields: Record<string, LabelTemplateField>;
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
    label_template?: LabelTemplate;
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

function capitalize(text: string): string {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1).replace(/_/g, " ");
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function applyTransform(
  value: unknown,
  transform: string,
  maxLength?: number,
): unknown {
  switch (transform) {
    case "slugify":
      return slugify(String(value));
    case "truncate":
      return truncate(String(value), maxLength ?? 30);
    case "capitalize":
      return capitalize(String(value));
    case "format_time":
      return formatTime(typeof value === "number" ? value : parseInt(String(value), 10) || 0);
    default:
      return String(value);
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

    // Apply metadata mappings (source fields → storyworld object fields)
    for (const meta of this.config.mappings.metadata_mapping) {
      const sourceRecord = task as Record<string, unknown>;
      const sourceFieldName = meta.source_field ?? meta.task_field;
      const targetFieldName = meta.target_field ?? meta.crop_field;
      if (!sourceFieldName || !targetFieldName) continue;
      const sourceValue = sourceRecord[sourceFieldName] ?? task.title;
      if (sourceValue !== undefined) {
        state[targetFieldName] = applyTransform(
          sourceValue,
          meta.transform,
          meta.max_length,
        );
      }
    }

    return state;
  }

  /**
   * Compute a label from the label_template config and a source object's fields.
   */
  private computeLabel(source: Record<string, unknown>): string | null {
    const template = this.config.mappings.label_template;
    if (!template) return null;

    let result = template.format;
    for (const [placeholder, fieldDef] of Object.entries(template.fields)) {
      let value = source[fieldDef.source_field];
      if ((value === undefined || value === null) && fieldDef.fallback_field) {
        value = source[fieldDef.fallback_field];
      }
      if (value === undefined || value === null) {
        value = "";
      }
      const transformed = fieldDef.transform
        ? applyTransform(value, fieldDef.transform)
        : String(value);
      result = result.replace(`{${placeholder}}`, String(transformed));
    }
    return result.trim();
  }

  /**
   * Ensure a storyworld object exists for the given source object.
   * Creates one via `executor.createObject` if it doesn't exist yet.
   * Returns the storyworld object ID.
   *
   * @param obj              Source object with at least an `id` field
   * @param sourceCollection Optional source collection name (e.g. "tasks", "sessions").
   *                         Defaults to the first object_mapping's source.
   */
  ensureObject(
    obj: { id: string; title?: string; content?: string; [key: string]: unknown },
    sourceCollection?: string,
    position?: { x: number; y: number },
  ): string | null {
    // Already tracked?
    const existing = this.taskObjectMap.get(obj.id);
    if (existing) {
      // If a position is provided, update the object's position in case it was
      // previously created without one (e.g. by syncObjects before the manual
      // placement call resolved).
      if (position) {
        const swObj = this.executor.getObject(existing);
        if (swObj?.renderState) {
          swObj.renderState.position = position;
        }
      }
      return existing;
    }

    const collection =
      sourceCollection ??
      this.config.mappings.object_mappings[0]?.source ??
      "tasks";
    const objectMapping = this.getObjectMapping(collection);
    if (!objectMapping) return null;

    const targetTypeId = objectMapping.target === "crops" ? "crop" : objectMapping.target;

    // Derive a stable storyworld ID from object metadata
    const label = obj.title ?? obj.content ?? obj.id;
    const objectId = slugify(label) || obj.id;

    // Don't recreate if the executor already has it (page remount)
    if (this.executor.getObject(objectId)) {
      this.taskObjectMap.set(obj.id, objectId);
      return objectId;
    }

    const initialState = this.buildInitialState(
      { ...obj, content: label },
      objectMapping,
    );

    // Compute label from template if configured
    const computedLabel = this.computeLabel(obj as Record<string, unknown>);
    if (computedLabel) {
      initialState[this.config.mappings.label_template!.target_field] = computedLabel;
    }

    const result = this.executor.createObject(targetTypeId, objectId, initialState, position);
    if (result.success) {
      this.taskObjectMap.set(obj.id, objectId);
      return objectId;
    }

    return null;
  }

  /**
   * Ensure a storyworld object exists for the given task.
   * Convenience wrapper around `ensureObject` for the "tasks" collection.
   */
  ensureObjectForTask(
    task: { id: string; title?: string; content?: string },
  ): string | null {
    return this.ensureObject(task, "tasks");
  }

  /**
   * Sync a list of source objects — creates storyworld objects for any that
   * don't yet have a corresponding object.
   *
   * @param objects          Source objects
   * @param sourceCollection Optional source collection name. Defaults to
   *                         the first object_mapping's source.
   */
  syncObjects(
    objects: Array<{ id: string; [key: string]: unknown }>,
    sourceCollection?: string,
  ): void {
    for (const obj of objects) {
      this.ensureObject(obj, sourceCollection);

      // Recompute label on existing objects (e.g. remaining time changes)
      const template = this.config.mappings.label_template;
      if (template) {
        const objectId = this.taskObjectMap.get(obj.id);
        if (objectId) {
          const swObj = this.executor.getObject(objectId);
          if (swObj) {
            const label = this.computeLabel(obj as Record<string, unknown>);
            if (label) {
              swObj.state[template.target_field] = label;
            }
          }
        }
      }
    }
  }

  /**
   * Sync a full list of tasks — creates storyworld objects for any tasks
   * that don't yet have a corresponding object.
   */
  syncTasks(
    tasks: Array<{ id: string; title?: string; content?: string }>,
  ): void {
    this.syncObjects(tasks, "tasks");
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
