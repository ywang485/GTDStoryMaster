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
  /** Tool ID discriminator — required in multi-tool configs. */
  tool?: string;
  source: string;
  target: string;
  initial_state: Record<string, unknown> | unknown[];
  /** If true, skip object creation silently when the target type doesn't exist in the executor. */
  synthetic?: boolean;
}

export interface ActionMappingCondition {
  param: string;
  equals: string;
}

export interface ActionMapping {
  /** Tool ID discriminator — required in multi-tool configs. */
  tool?: string;
  source_action: string;
  type: "toolAction" | "UIAction";
  condition?: ActionMappingCondition;
  target_action: string;
  target_params: Array<{ source: string; target: string }> | unknown[];
  /** If true, skip executor call silently when the target action doesn't exist. */
  synthetic?: boolean;
}

export interface MetadataMapping {
  /** Target field name on the storyworld object. */
  target_field?: string;
  /** @deprecated Use target_field instead */
  crop_field?: string;
  transform: "slugify" | "truncate" | "capitalize" | "format_time" | "template";
  /** Tool ID discriminator — when set, this mapping only applies to objects from that tool. */
  tool?: string;
  // For simple transforms:
  /** Single source field (backward compat). */
  source_field?: string;
  /** @deprecated Use source_field instead */
  task_field?: string;
  /** Multiple source fields — tried in order, first non-null/non-empty value wins. */
  source_fields?: string[];
  max_length?: number;
  // For transform: "template" only:
  /** Format string with named {placeholders}. */
  format?: string;
  /** Named slots in the format string. */
  fields?: Record<string, {
    source_field?: string;
    /** Multiple source fields — tried in order, first non-empty wins. */
    source_fields?: string[];
    transform?: "slugify" | "truncate" | "capitalize" | "format_time";
  }>;
}

export interface ToolStoryworldMappingConfig {
  mapping_name: string;
  description: string;
  version: string;
  /** Single tool ID (backward compat). Prefer `tools` for new configs. */
  tool?: string;
  /** Tool IDs this config maps. At least one of `tool` / `tools` must be set. */
  tools?: string[];
  storyworld: string;
  mappings: {
    object_mappings: ObjectMapping[];
    action_mappings: ActionMapping[];
    /** `label_template` has been folded in here as `transform: "template"`. */
    metadata_mapping: MetadataMapping[];
  };
}

/** @deprecated Use MetadataMapping with transform: "template" instead. */
export interface LabelTemplateField {
  source_field: string;
  fallback_field?: string;
  transform?: string;
}

/** @deprecated Use MetadataMapping with transform: "template" instead. */
export interface LabelTemplate {
  target_field: string;
  format: string;
  fields: Record<string, LabelTemplateField>;
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

/**
 * Resolve source value from a source object, trying multiple field names in
 * order. The first non-null, non-undefined, non-empty-string value wins.
 */
function resolveSourceValue(
  source: Record<string, unknown>,
  sourceFields?: string[],
  sourceField?: string,
): unknown {
  if (sourceFields && sourceFields.length > 0) {
    for (const field of sourceFields) {
      const val = source[field];
      if (val !== undefined && val !== null && val !== "") return val;
    }
  }
  if (sourceField) {
    const val = source[sourceField];
    if (val !== undefined) return val;
  }
  return undefined;
}

// ── Bridge class ───────────────────────────────────────────────────────────

export class MappingBridge {
  readonly config: ToolStoryworldMappingConfig;
  private executor: BaseStoryWorldExecutor;
  /** Normalized list of tool IDs from the config. */
  readonly toolIds: string[];
  /** Maps tool task ID → storyworld object ID */
  private taskObjectMap = new Map<string, string>();

  constructor(
    config: ToolStoryworldMappingConfig,
    executor: BaseStoryWorldExecutor,
  ) {
    this.config = config;
    this.executor = executor;
    this.toolIds = config.tools?.length
      ? config.tools
      : config.tool
        ? [config.tool]
        : [];
  }

  // ── Object lifecycle ───────────────────────────────────────────────────

  /**
   * Resolve the target object mapping for a given source collection name.
   * Optionally filter by tool ID.
   */
  private getObjectMapping(sourceCollection: string, toolId?: string): ObjectMapping | undefined {
    return this.config.mappings.object_mappings.find((m) => {
      if (m.source !== sourceCollection) return false;
      if (toolId && m.tool && m.tool !== toolId) return false;
      return true;
    });
  }

  /**
   * Returns true if a MetadataMapping entry applies to the given tool.
   * An entry without a `tool` field applies to all tools.
   */
  private metaMatchesTool(meta: MetadataMapping, toolId?: string): boolean {
    if (toolId && meta.tool && meta.tool !== toolId) return false;
    return true;
  }

  /**
   * Find the template MetadataMapping entry (transform === "template") for the
   * given tool. An entry without a `tool` field matches any tool.
   */
  private getTemplateMapping(toolId?: string): MetadataMapping | undefined {
    return this.config.mappings.metadata_mapping.find(
      (m) => m.transform === "template" && this.metaMatchesTool(m, toolId),
    );
  }

  /**
   * Build the initial state for a new storyworld object from the mapping
   * config's `initial_state` field, plus any metadata transformations.
   */
  private buildInitialState(
    task: { id: string; title?: string; content?: string },
    mapping: ObjectMapping,
    toolId?: string,
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
      if (meta.transform === "template") continue; // handled separately in ensureObject
      if (!this.metaMatchesTool(meta, toolId)) continue;
      const sourceRecord = task as Record<string, unknown>;
      const targetFieldName = meta.target_field ?? meta.crop_field;
      if (!targetFieldName) continue;

      const sourceValue =
        resolveSourceValue(
          sourceRecord,
          meta.source_fields,
          meta.source_field ?? meta.task_field,
        ) ?? task.title;
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
   * Compute a label from the template MetadataMapping and a source object's fields.
   * Returns `{ targetField, value }` or null if no template is configured.
   */
  private computeLabel(
    source: Record<string, unknown>,
    toolId?: string,
  ): { targetField: string; value: string } | null {
    const template = this.getTemplateMapping(toolId);
    if (!template?.format || !template.fields || !template.target_field) return null;

    let result = template.format;
    for (const [placeholder, fieldDef] of Object.entries(template.fields)) {
      const value = resolveSourceValue(source, fieldDef.source_fields, fieldDef.source_field) ?? "";
      const transformed = fieldDef.transform
        ? applyTransform(value, fieldDef.transform)
        : String(value);
      result = result.replace(`{${placeholder}}`, String(transformed));
    }
    return { targetField: template.target_field, value: result.trim() };
  }

  /**
   * Ensure a storyworld object exists for the given source object.
   * Creates one via `executor.createObject` if it doesn't exist yet.
   * Returns the storyworld object ID, or null if creation was skipped.
   *
   * @param obj              Source object with at least an `id` field
   * @param sourceCollection Optional source collection name (e.g. "tasks", "sessions").
   *                         Defaults to the first object_mapping's source.
   * @param position         Optional initial render position.
   * @param toolId           Optional tool ID discriminator for multi-tool configs.
   */
  ensureObject(
    obj: { id: string; title?: string; content?: string; [key: string]: unknown },
    sourceCollection?: string,
    position?: { x: number; y: number },
    toolId?: string,
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
    const objectMapping = this.getObjectMapping(collection, toolId);
    if (!objectMapping) return null;

    // Synthetic object type — skip executor call silently
    if (objectMapping.synthetic) return null;

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
      toolId,
    );

    // Compute label from template if configured
    const computed = this.computeLabel(obj as Record<string, unknown>, toolId);
    if (computed) {
      initialState[computed.targetField] = computed.value;
    }

    // If no explicit position was given, check if the initialState carries one
    // (e.g. billboard initial_state: { position: { x: 700, y: 150 } }).
    // The executor uses the position arg for renderState.position; initialState
    // values go to instance.state, so we extract and pass it as the dedicated arg.
    let resolvedPosition = position;
    if (!resolvedPosition && initialState.position && typeof initialState.position === "object") {
      const posObj = initialState.position as { x?: unknown; y?: unknown };
      if (typeof posObj.x === "number" && typeof posObj.y === "number") {
        resolvedPosition = { x: posObj.x, y: posObj.y };
      }
    }

    const result = this.executor.createObject(targetTypeId, objectId, initialState, resolvedPosition);
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
   * @param toolId           Optional tool ID discriminator for multi-tool configs.
   */
  syncObjects(
    objects: Array<{ id: string; [key: string]: unknown }>,
    sourceCollection?: string,
    toolId?: string,
  ): void {
    const templateMapping = this.getTemplateMapping(toolId);
    for (const obj of objects) {
      this.ensureObject(obj, sourceCollection, undefined, toolId);

      // Recompute label on existing objects (e.g. remaining time changes)
      if (templateMapping) {
        const objectId = this.taskObjectMap.get(obj.id);
        if (objectId) {
          const swObj = this.executor.getObject(objectId);
          if (swObj) {
            const computed = this.computeLabel(obj as Record<string, unknown>, toolId);
            if (computed) {
              swObj.state[computed.targetField] = computed.value;
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
   * Optionally filter by tool ID.
   */
  private findActionMappings(
    sourceAction: string,
    type: "toolAction" | "UIAction",
    params?: Record<string, unknown>,
    toolId?: string,
  ): ActionMapping[] {
    return this.config.mappings.action_mappings.filter((m) => {
      if (m.source_action !== sourceAction) return false;
      if (m.type !== type) return false;
      if (toolId && m.tool && m.tool !== toolId) return false;
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
   * @param toolId       Optional tool ID discriminator for multi-tool configs.
   */
  async onToolAction(
    taskId: string,
    sourceAction: string,
    params?: Record<string, unknown>,
    toolId?: string,
  ): Promise<ActionResult[]> {
    const objectId = this.taskObjectMap.get(taskId);
    if (!objectId) return [];

    const mappings = this.findActionMappings(sourceAction, "toolAction", params, toolId);
    const results: ActionResult[] = [];

    for (const mapping of mappings) {
      // Synthetic action mapping — skip executor call, return no-op success
      if (mapping.synthetic) {
        results.push({ success: true });
        continue;
      }

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
