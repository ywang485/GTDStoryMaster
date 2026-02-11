/**
 * StoryWorld Executor
 *
 * Runtime execution engine for storyworld state machines.
 * Handles action execution, state transitions, asset rendering,
 * and narrative output.
 */

import type {
  StoryWorldDefinition,
  StoryWorldState,
  ObjectInstance,
  ObjectType,
  ObjectAction,
  ActionResult,
  StateChange,
  RenderInstruction,
  StoryWorldPublicState,
} from "@/types/storyworld-definition";

/**
 * Validates preconditions for an action
 */
function validatePreconditions(
  action: ObjectAction,
  objectState: Record<string, any>,
  worldState: StoryWorldState,
): { valid: boolean; reason?: string } {
  if (!action.logic.preconditions) {
    return { valid: true };
  }

  for (const condition of action.logic.preconditions) {
    const value = objectState[condition.variable];

    let met = false;
    switch (condition.operator) {
      case "==":
        met = value === condition.value;
        break;
      case "!=":
        met = value !== condition.value;
        break;
      case ">":
        met = value > condition.value;
        break;
      case "<":
        met = value < condition.value;
        break;
      case ">=":
        met = value >= condition.value;
        break;
      case "<=":
        met = value <= condition.value;
        break;
      case "in":
        met = Array.isArray(condition.value) && condition.value.includes(value);
        break;
      case "not_in":
        met = Array.isArray(condition.value) && !condition.value.includes(value);
        break;
    }

    if (!met) {
      return {
        valid: false,
        reason: `Precondition failed: ${condition.variable} ${condition.operator} ${condition.value}`,
      };
    }
  }

  return { valid: true };
}

/**
 * Applies a state change to an object or world state
 */
function applyStateChange(
  change: StateChange,
  targetState: Record<string, any>,
): void {
  const currentValue = targetState[change.variable];

  switch (change.operation) {
    case "set":
      targetState[change.variable] = change.value;
      break;
    case "add":
      targetState[change.variable] = currentValue + change.value;
      break;
    case "subtract":
      targetState[change.variable] = currentValue - change.value;
      break;
    case "multiply":
      targetState[change.variable] = currentValue * change.value;
      break;
    case "divide":
      targetState[change.variable] = currentValue / change.value;
      break;
    case "append":
      if (Array.isArray(currentValue)) {
        targetState[change.variable] = [...currentValue, change.value];
      }
      break;
    case "remove":
      if (Array.isArray(currentValue)) {
        targetState[change.variable] = currentValue.filter((v) => v !== change.value);
      }
      break;
  }
}

/**
 * StoryWorld Executor - Manages storyworld runtime
 */
export class StoryWorldExecutor {
  private definition: StoryWorldDefinition;
  private state: StoryWorldState;
  private objectTypesMap: Map<string, ObjectType>;

  constructor(definition: StoryWorldDefinition, existingState?: StoryWorldState) {
    this.definition = definition;
    this.objectTypesMap = new Map(
      definition.objectTypes.map((t) => [t.id, t])
    );

    if (existingState) {
      this.state = existingState;
    } else {
      // Initialize new state
      this.state = {
        worldId: definition.id,
        objects: {},
        globalState: definition.globalState?.initialState || {},
        activeRenders: [],
        narrativeHistory: [],
        createdAt: Date.now(),
        lastModified: Date.now(),
      };
    }
  }

  /**
   * Create a new object instance in the world
   */
  createObject(
    typeId: string,
    objectId?: string,
    initialState?: Record<string, any>,
  ): ActionResult {
    const objectType = this.objectTypesMap.get(typeId);
    if (!objectType) {
      return {
        success: false,
        error: {
          code: "INVALID_TYPE",
          message: `Object type '${typeId}' not found`,
        },
      };
    }

    const id = objectId || `${typeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Build initial state from type definition
    const state: Record<string, any> = {};
    for (const variable of objectType.stateVariables) {
      state[variable.name] = variable.default;
    }

    // Override with provided initial state
    if (initialState) {
      Object.assign(state, initialState);
    }

    // Override with type's initial state
    if (objectType.initialState) {
      Object.assign(state, objectType.initialState);
    }

    const instance: ObjectInstance = {
      id,
      typeId,
      state,
      renderState: {
        visible: true,
        opacity: 1,
      },
    };

    this.state.objects[id] = instance;
    this.state.lastModified = Date.now();

    return {
      success: true,
      narrativeText: `Created ${objectType.name} '${id}'`,
    };
  }

  /**
   * Execute an action on an object
   */
  async executeAction(
    objectId: string,
    actionId: string,
    params?: Record<string, any>,
  ): Promise<ActionResult> {
    const object = this.state.objects[objectId];
    if (!object) {
      return {
        success: false,
        error: {
          code: "OBJECT_NOT_FOUND",
          message: `Object '${objectId}' not found`,
        },
      };
    }

    const objectType = this.objectTypesMap.get(object.typeId);
    if (!objectType) {
      return {
        success: false,
        error: {
          code: "TYPE_NOT_FOUND",
          message: `Object type '${object.typeId}' not found`,
        },
      };
    }

    const action = objectType.actions.find((a) => a.id === actionId);
    if (!action) {
      return {
        success: false,
        error: {
          code: "ACTION_NOT_FOUND",
          message: `Action '${actionId}' not found for type '${object.typeId}'`,
        },
      };
    }

    // Validate preconditions
    const validation = validatePreconditions(action, object.state, this.state);
    if (!validation.valid) {
      return {
        success: false,
        error: {
          code: "PRECONDITION_FAILED",
          message: validation.reason || "Preconditions not met",
        },
      };
    }

    // Execute action logic
    let stateChanges: StateChange[] = [];
    let renderInstructions: RenderInstruction[] = [];
    let narrativeText = "";

    // Apply custom logic if provided
    if (action.logic.customLogic) {
      const customResult = action.logic.customLogic(
        params || {},
        object.state,
        this.state,
      );
      if (customResult.stateChanges) {
        stateChanges.push(...customResult.stateChanges);
      }
      if (customResult.renderInstructions) {
        renderInstructions.push(...customResult.renderInstructions);
      }
      if (customResult.narrativeText) {
        narrativeText = customResult.narrativeText;
      }
    } else {
      // Apply standard logic
      if (action.logic.stateChanges) {
        stateChanges = action.logic.stateChanges;
      }
      if (action.logic.renderInstructions) {
        renderInstructions = action.logic.renderInstructions;
      }
      if (action.logic.narrativeText) {
        narrativeText =
          typeof action.logic.narrativeText === "function"
            ? action.logic.narrativeText(params || {}, object.state)
            : action.logic.narrativeText;
      }
    }

    // Apply state changes
    for (const change of stateChanges) {
      if (!change.objectId || change.objectId === objectId) {
        // Apply to current object
        applyStateChange(change, object.state);
      } else {
        // Apply to another object
        const targetObject = this.state.objects[change.objectId];
        if (targetObject) {
          applyStateChange(change, targetObject.state);
        }
      }
    }

    // Add onStart render instructions
    if (action.onStart) {
      renderInstructions.unshift(...action.onStart);
    }

    // Add onComplete render instructions
    if (action.onComplete) {
      renderInstructions.push(...action.onComplete);
    }

    // Store active renders
    const now = Date.now();
    for (const instruction of renderInstructions) {
      this.state.activeRenders.push({
        id: `render-${now}-${Math.random().toString(36).substr(2, 9)}`,
        instruction,
        startTime: now,
        endTime: instruction.duration ? now + instruction.duration : undefined,
      });
    }

    // Store narrative
    if (narrativeText) {
      this.state.narrativeHistory.push({
        timestamp: now,
        text: narrativeText,
        sourceObjectId: objectId,
        sourceAction: actionId,
      });
    }

    // Execute side effects
    const sideEffects: ActionResult["sideEffects"] = [];
    if (action.logic.sideEffects) {
      for (const effect of action.logic.sideEffects) {
        const targetId = effect.objectId || objectId;
        const result = await this.executeAction(
          targetId,
          effect.action,
          effect.params,
        );
        sideEffects.push({
          objectId: targetId,
          action: effect.action,
          result,
        });
      }
    }

    this.state.lastModified = Date.now();

    return {
      success: true,
      stateChanges,
      renderInstructions,
      narrativeText,
      sideEffects: sideEffects.length > 0 ? sideEffects : undefined,
    };
  }

  /**
   * Render narrative text (root-level action)
   */
  async renderNarrative(text: string, style?: any): Promise<ActionResult> {
    const renderer = this.definition.narrativeRenderer;
    const now = Date.now();

    // Apply template if provided
    let finalText = text;
    if (renderer.template) {
      finalText =
        typeof renderer.template === "function"
          ? renderer.template(text, { worldState: this.state })
          : renderer.template.replace("{text}", text);
    }

    // Create render instruction
    const instruction: RenderInstruction = {
      type: "display_text",
      text: finalText,
      style: style || renderer.defaultStyle,
    };

    this.state.activeRenders.push({
      id: `narrative-${now}`,
      instruction,
      startTime: now,
    });

    this.state.narrativeHistory.push({
      timestamp: now,
      text: finalText,
    });

    this.state.lastModified = Date.now();

    return {
      success: true,
      renderInstructions: [instruction],
      narrativeText: finalText,
    };
  }

  /**
   * Get current state
   */
  getState(): StoryWorldState {
    return this.state;
  }

  /**
   * Get object by ID
   */
  getObject(objectId: string): ObjectInstance | undefined {
    return this.state.objects[objectId];
  }

  /**
   * Get all objects of a specific type
   */
  getObjectsByType(typeId: string): ObjectInstance[] {
    return Object.values(this.state.objects).filter((obj) => obj.typeId === typeId);
  }

  /**
   * Update global state
   */
  updateGlobalState(variable: string, value: any): void {
    this.state.globalState[variable] = value;
    this.state.lastModified = Date.now();
  }

  /**
   * Clean up expired render instructions
   */
  cleanupExpiredRenders(): void {
    const now = Date.now();
    this.state.activeRenders = this.state.activeRenders.filter(
      (render) => !render.endTime || render.endTime > now,
    );
  }

  /**
   * Get public state for AI/external systems
   */
  getPublicState(): StoryWorldPublicState {
    const objects = Object.values(this.state.objects).map((obj) => {
      const objectType = this.objectTypesMap.get(obj.typeId);
      return {
        id: obj.id,
        type: obj.typeId,
        state: obj.state,
        availableActions: objectType?.actions.map((a) => a.id) || [],
      };
    });

    return {
      worldId: this.state.worldId,
      worldName: this.definition.name,
      objects,
      globalState: this.state.globalState,
      recentNarrative: this.state.narrativeHistory
        .slice(-10)
        .map((entry) => entry.text),
      stats: {
        totalObjects: Object.keys(this.state.objects).length,
        totalActions: this.definition.objectTypes.reduce(
          (sum, type) => sum + type.actions.length,
          0,
        ),
        narrativeLength: this.state.narrativeHistory.length,
      },
    };
  }

  /**
   * Export state for persistence
   */
  exportState(): StoryWorldState {
    return JSON.parse(JSON.stringify(this.state));
  }

  /**
   * Import state from persistence
   */
  importState(state: StoryWorldState): void {
    this.state = state;
  }

  /**
   * Reset to initial state
   */
  reset(): void {
    this.state = {
      worldId: this.definition.id,
      objects: {},
      globalState: this.definition.globalState?.initialState || {},
      activeRenders: [],
      narrativeHistory: [],
      createdAt: Date.now(),
      lastModified: Date.now(),
    };
  }
}

/**
 * Create a storyworld executor from a definition
 */
export function createStoryWorldExecutor(
  definition: StoryWorldDefinition,
  existingState?: StoryWorldState,
): StoryWorldExecutor {
  return new StoryWorldExecutor(definition, existingState);
}
