/**
 * Storyworld Definition System
 *
 * Defines interactive storyworlds as object-oriented state machines.
 * Definitions are schema-only — action logic lives in executor subclasses,
 * mirroring the tool system's ToolDefinition / BaseToolExecutor pattern.
 *
 * Architecture:
 * - Object Types: Classes of interactive objects (Character, Item, Location, etc.)
 * - State Variables: Track object state (position, health, inventory, etc.)
 * - Actions: Metadata-only declarations (logic implemented in executor handlers)
 * - Assets: Visual/audio resources tied to states and actions
 */

/**
 * Asset types for rendering and interaction feedback
 */
export type AssetType =
  | "sprite"        // 2D images
  | "model"         // 3D models
  | "animation"     // Animation sequences
  | "sound"         // Sound effects
  | "music"         // Background music
  | "particle"      // Particle effects
  | "shader"        // Visual shaders
  | "video";        // Video clips

/**
 * Single asset with metadata
 */
export interface Asset {
  id: string;
  type: AssetType;
  url: string;
  tileIndex?: number;
  tileSize?: number;
  tilesPerRow?: number;
  scale?: number;
  metadata?: {
    duration?: number;        // For animations, sounds, videos
    loop?: boolean;           // For animations, music
    volume?: number;          // For audio (0-1)
    dimensions?: {            // For sprites, models
      width: number;
      height: number;
      depth?: number;
    };
    tags?: string[];          // For categorization
  };
}

/**
 * Collection of assets for an object type
 */
export interface AssetLibrary {
  // Assets for different states
  stateAssets?: Record<string, Asset[]>;

  // Assets for state transitions
  transitionAssets?: Record<string, Asset[]>; // key: "fromState->toState"

  // Assets for actions
  actionAssets?: Record<string, Asset[]>;

  // General/default assets
  defaultAssets?: Asset[];
}

/**
 * Parameter definition for actions
 */
export interface ActionParameter {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  required?: boolean;
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: any[];
  };
}

/**
 * State variable definition for object types
 */
export interface StateVariable {
  name: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  description: string;
  default: any;
  validation?: {
    min?: number;
    max?: number;
    enum?: any[];
  };
}

/**
 * Action definition for object types (metadata only — logic in executor)
 */
export interface ObjectAction {
  id: string;
  name: string;
  description: string;
  parameters?: ActionParameter[];
}

/**
 * Object type definition (class of interactive objects)
 */
export interface ObjectType {
  id: string;
  name: string;
  description: string;

  // State definition
  stateVariables: StateVariable[];

  // Available actions (metadata only)
  actions: ObjectAction[];

  // Asset library for this object type
  assets: AssetLibrary;

  // Initial state
  initialState?: Record<string, any>;

  // Rendering configuration
  renderConfig?: {
    layer?: number;           // Z-order for rendering
    priority?: number;        // Render priority
    persistent?: boolean;     // Keep rendered across scenes
    interactable?: boolean;   // Can user interact with it
  };
}

/**
 * Complete storyworld definition (schema only — no logic)
 */
export interface StoryWorldDefinition {
  id: string;
  name: string;
  description: string;
  version: string;

  // Object types in this storyworld
  objectTypes: ObjectType[];

  // Global assets (backgrounds, ambient sounds, etc.)
  globalAssets?: AssetLibrary;

  // Global state (weather, time, etc.)
  globalState?: {
    variables: StateVariable[];
    initialState?: Record<string, any>;
  };

  // Metadata
  metadata?: {
    author?: string;
    tags?: string[];
    thumbnail?: string;
    rating?: string;
  };
}

/**
 * Runtime instance of an object
 */
export interface ObjectInstance {
  id: string;              // Unique instance ID
  typeId: string;          // Object type ID
  state: Record<string, any>;

  // Visual state
  renderState?: {
    visible: boolean;
    position?: { x: number; y: number; z?: number };
    scale?: number;
    rotation?: number;
    opacity?: number;
    currentAnimation?: string;
  };
}

/**
 * Runtime state of a storyworld
 */
export interface StoryWorldState {
  worldId: string;

  // Object instances
  objects: Record<string, ObjectInstance>;  // key: objectId

  // Global state
  globalState: Record<string, any>;

  // Narrative history
  narrativeHistory: Array<{
    timestamp: number;
    text: string;
    sourceObjectId?: string;
    sourceAction?: string;
  }>;

  // Metadata
  createdAt: number;
  lastModified: number;
}

/**
 * Result of executing an action
 */
export interface ActionResult {
  success: boolean;
  narrativeText?: string;
  error?: string;
}

/**
 * Public state exposed to AI/external systems
 */
export interface StoryWorldPublicState {
  worldId: string;
  worldName: string;

  // Object summaries
  objects: Array<{
    id: string;
    type: string;
    state: Record<string, any>;
    availableActions: string[];
  }>;

  // Global state
  globalState: Record<string, any>;

  // Recent narrative
  recentNarrative: string[];

  // Statistics
  stats?: {
    totalObjects: number;
    totalActions: number;
    narrativeLength: number;
  };
}
