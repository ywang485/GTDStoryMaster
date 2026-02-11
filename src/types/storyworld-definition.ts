/**
 * Storyworld Definition System
 *
 * Defines interactive storyworlds as object-oriented state machines focused on
 * presentation and user interaction. Storyworlds handle rendering, assets, and
 * visual feedback, while tools handle data processing and logic.
 *
 * Architecture:
 * - Object Types: Classes of interactive objects (Character, Item, Location, etc.)
 * - State Variables: Track object state (position, health, inventory, etc.)
 * - Actions: Parameterized operations that modify state
 * - Action Logic: State transition rules
 * - Assets: Visual/audio resources tied to states and transitions
 * - Narrative Rendering: Built-in text output capability
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
 * Rendering instruction for visual output
 */
export interface RenderInstruction {
  type: "play_animation" | "show_sprite" | "play_sound" | "play_music" |
        "show_particle" | "apply_shader" | "display_text" | "play_video";
  assetId?: string;
  duration?: number;
  position?: { x: number; y: number; z?: number };
  scale?: number;
  rotation?: number;
  opacity?: number;
  transition?: {
    type: "fade" | "slide" | "zoom" | "dissolve";
    duration: number;
  };
  text?: string;  // For display_text
  style?: any;    // For text styling
}

/**
 * State change specification
 */
export interface StateChange {
  objectId?: string;  // If omitted, applies to current object
  objectType?: string;
  variable: string;
  operation: "set" | "add" | "subtract" | "multiply" | "divide" | "append" | "remove";
  value: any;
  condition?: string;  // Optional condition for the change
}

/**
 * Action logic - defines what happens when action is executed
 */
export interface ActionLogic {
  // State changes to apply
  stateChanges?: StateChange[];

  // Rendering instructions
  renderInstructions?: RenderInstruction[];

  // Narrative text to output
  narrativeText?: string | ((params: any, state: any) => string);

  // Conditions for execution
  preconditions?: Array<{
    variable: string;
    operator: "==" | "!=" | ">" | "<" | ">=" | "<=" | "in" | "not_in";
    value: any;
  }>;

  // Side effects (actions triggered on other objects)
  sideEffects?: Array<{
    objectId?: string;
    objectType?: string;
    action: string;
    params?: Record<string, any>;
  }>;

  // Custom logic function
  customLogic?: (params: any, objectState: any, worldState: any) => {
    stateChanges?: StateChange[];
    renderInstructions?: RenderInstruction[];
    narrativeText?: string;
  };
}

/**
 * Action definition for object types
 */
export interface ObjectAction {
  id: string;
  name: string;
  description: string;
  parameters?: ActionParameter[];
  logic: ActionLogic;

  // Visual/audio feedback
  onStart?: RenderInstruction[];
  onComplete?: RenderInstruction[];
  onError?: RenderInstruction[];
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

  // Available actions
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
 * Root-level narrative rendering action
 */
export interface NarrativeRenderer {
  action: ObjectAction;  // The renderNarrative action

  // Default rendering configuration
  defaultStyle?: {
    fontSize?: number;
    fontFamily?: string;
    color?: string;
    backgroundColor?: string;
    animation?: "typewriter" | "fade" | "slide" | "none";
    speed?: number;
  };

  // Template for narrative formatting
  template?: string | ((text: string, context: any) => string);
}

/**
 * Complete storyworld definition
 */
export interface StoryWorldDefinition {
  id: string;
  name: string;
  description: string;
  version: string;

  // Object types in this storyworld
  objectTypes: ObjectType[];

  // Root-level narrative rendering
  narrativeRenderer: NarrativeRenderer;

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

  // Active renderings
  activeRenders: Array<{
    id: string;
    instruction: RenderInstruction;
    startTime: number;
    endTime?: number;
  }>;

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

  // State changes that were applied
  stateChanges?: StateChange[];

  // Rendering instructions to execute
  renderInstructions?: RenderInstruction[];

  // Narrative text generated
  narrativeText?: string;

  // Error if action failed
  error?: {
    code: string;
    message: string;
    details?: any;
  };

  // Side effects triggered
  sideEffects?: Array<{
    objectId: string;
    action: string;
    result: ActionResult;
  }>;
}

/**
 * Tool-to-Storyworld mapping configuration
 * (For future use when binding tools to storyworlds)
 */
export interface ToolStoryWorldBinding {
  toolId: string;
  storyWorldId: string;

  // Map tool actions to storyworld actions
  actionMappings: Array<{
    toolAction: string;
    storyWorldObjectType: string;
    storyWorldAction: string;
    parameterMapping?: Record<string, string>;  // toolParam -> storyWorldParam
  }>;

  // Map tool states to storyworld states
  stateMappings: Array<{
    toolState: string;
    storyWorldObjectId: string;
    storyWorldStateVariable: string;
    transformation?: (toolValue: any) => any;
  }>;

  // Visual rendering preferences
  renderingPreferences?: {
    showToolActions: boolean;
    animateStateChanges: boolean;
    playAudioFeedback: boolean;
  };
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
