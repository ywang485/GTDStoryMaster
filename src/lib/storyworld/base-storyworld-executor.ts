/**
 * Base StoryWorld Executor
 *
 * Abstract base class that implements shared executor boilerplate.
 * Subclasses implement handler methods for each action:
 *   action "water" → this.handleWater(instance, params)
 *
 * Mirrors the tool system's BaseToolExecutor pattern.
 */

import type {
  StoryWorldDefinition,
  StoryWorldState,
  ObjectInstance,
  ObjectType,
  ActionResult,
  StoryWorldPublicState,
  AssetLibrary,
} from "@/types/storyworld-definition";
import type { StoryWorldRendererInterface } from "./renderer-interface";

/** Margins defining the placement-prohibited area from each canvas edge. */
export interface PlacementMargin {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

export abstract class BaseStoryWorldExecutor {
  readonly definition: StoryWorldDefinition;
  protected state: StoryWorldState;
  protected objectTypesMap: Map<string, ObjectType>;
  protected _renderer: StoryWorldRendererInterface | null = null;

  /** Asset library per object type (key: objectType id) */
  protected objectAssets: Record<string, AssetLibrary> = {};

  /** Global assets (backgrounds, ambient sounds, etc.) */
  protected globalAssets: AssetLibrary = {};

  /** Canvas dimensions used for random placement (set via setCanvasSize) */
  protected canvasWidth = 800;
  protected canvasHeight = 600;

  /** Per-object-type placement margins (key: objectType id) */
  protected placementMargins: Record<string, PlacementMargin> = {};

  constructor(definition: StoryWorldDefinition, existingState?: StoryWorldState) {
    this.definition = definition;
    this.objectTypesMap = new Map(
      definition.objectTypes.map((t) => [t.id, t])
    );

    if (existingState) {
      this.state = existingState;
    } else {
      this.state = {
        worldId: definition.id,
        objects: {},
        globalState: definition.globalState?.initialState || {},
        narrativeHistory: [],
        createdAt: Date.now(),
        lastModified: Date.now(),
      };
    }
  }

  /** Inject the renderer so action handlers can call it directly */
  setRenderer(renderer: StoryWorldRendererInterface): void {
    this._renderer = renderer;
  }

  /** Update canvas dimensions used for random placement */
  setCanvasSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  protected get renderer(): StoryWorldRendererInterface {
    if (!this._renderer) {
      throw new Error("Renderer not set. Call setRenderer() before executing actions.");
    }
    return this._renderer;
  }

  // ---------------------------------------------------------------------------
  // Object lifecycle
  // ---------------------------------------------------------------------------

  createObject(
    typeId: string,
    objectId?: string,
    initialState?: Record<string, any>,
    position?: { x: number; y: number },
  ): ActionResult {
    const objectType = this.objectTypesMap.get(typeId);
    if (!objectType) {
      return {
        success: false,
        error: `Object type '${typeId}' not found`,
      };
    }

    const id = objectId || `${typeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Build initial state from type definition defaults
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

    // Use provided position or compute random position within margins
    let finalPosition: { x: number; y: number };
    if (position) {
      finalPosition = position;
    } else {
      const margin = this.placementMargins[typeId] || {};
      const minX = margin.left ?? 0;
      const maxX = this.canvasWidth - (margin.right ?? 0);
      const minY = margin.top ?? 0;
      const maxY = this.canvasHeight - (margin.bottom ?? 0);
      finalPosition = {
        x: minX + Math.random() * Math.max(0, maxX - minX),
        y: minY + Math.random() * Math.max(0, maxY - minY),
      };
    }

    const instance: ObjectInstance = {
      id,
      typeId,
      state,
      renderState: {
        visible: true,
        opacity: 1,
        position: finalPosition,
      },
    };

    this.state.objects[id] = instance;
    this.state.lastModified = Date.now();

    return {
      success: true,
      narrativeText: `Created ${objectType.name} '${id}'`,
    };
  }

  // ---------------------------------------------------------------------------
  // Convention-based action routing
  // ---------------------------------------------------------------------------

  async executeAction(
    objectId: string,
    actionId: string,
    params?: Record<string, any>,
  ): Promise<ActionResult> {
    const instance = this.state.objects[objectId];
    if (!instance) {
      return {
        success: false,
        error: `Object '${objectId}' not found`,
      };
    }

    const objectType = this.objectTypesMap.get(instance.typeId);
    if (!objectType) {
      return {
        success: false,
        error: `Object type '${instance.typeId}' not found`,
      };
    }

    const action = objectType.actions.find((a) => a.id === actionId);
    if (!action) {
      return {
        success: false,
        error: `Action '${actionId}' not found for type '${instance.typeId}'`,
      };
    }

    // Convention: action "give_gift" → handler "handleGive_gift"
    const handlerName = `handle${actionId.charAt(0).toUpperCase()}${actionId.slice(1)}`;
    const handler = (this as Record<string, unknown>)[handlerName];

    if (typeof handler !== "function") {
      return {
        success: false,
        error: `No handler '${handlerName}' found for action '${actionId}'`,
      };
    }

    const result = await (
      handler as (instance: ObjectInstance, params: Record<string, any>) => Promise<ActionResult>
    ).call(this, instance, params || {});

    // Record narrative
    if (result.success && result.narrativeText) {
      this.state.narrativeHistory.push({
        timestamp: Date.now(),
        text: result.narrativeText,
        sourceObjectId: objectId,
        sourceAction: actionId,
      });
    }

    this.state.lastModified = Date.now();
    return result;
  }

  // ---------------------------------------------------------------------------
  // State access
  // ---------------------------------------------------------------------------

  getState(): StoryWorldState {
    return this.state;
  }

  getObject(objectId: string): ObjectInstance | undefined {
    return this.state.objects[objectId];
  }

  getObjectsByType(typeId: string): ObjectInstance[] {
    return Object.values(this.state.objects).filter((obj) => obj.typeId === typeId);
  }

  updateGlobalState(variable: string, value: any): void {
    this.state.globalState[variable] = value;
    this.state.lastModified = Date.now();
  }

  getObjectAssets(): Record<string, AssetLibrary> {
    return this.objectAssets;
  }

  getGlobalAssets(): AssetLibrary {
    return this.globalAssets;
  }

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

  // ---------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------

  exportState(): StoryWorldState {
    return JSON.parse(JSON.stringify(this.state));
  }

  importState(state: StoryWorldState): void {
    this.state = state;
  }

  reset(): void {
    this.state = {
      worldId: this.definition.id,
      objects: {},
      globalState: this.definition.globalState?.initialState || {},
      narrativeHistory: [],
      createdAt: Date.now(),
      lastModified: Date.now(),
    };
  }
}
