/**
 * StoryWorld System
 *
 * Interactive storyworld state machines for visual/audio presentation.
 * Complements the tool system by handling rendering and user interaction.
 */

export { StoryWorldExecutor, createStoryWorldExecutor } from "./storyworld-executor";
export { fantasyWorld } from "./examples/fantasy-world";

export type {
  // Core types
  StoryWorldDefinition,
  StoryWorldState,
  StoryWorldPublicState,

  // Object types
  ObjectType,
  ObjectInstance,
  ObjectAction,
  StateVariable,
  ActionParameter,

  // Action logic
  ActionLogic,
  StateChange,
  ActionResult,

  // Rendering
  Asset,
  AssetType,
  AssetLibrary,
  RenderInstruction,
  NarrativeRenderer,

  // Tool binding (for future use)
  ToolStoryWorldBinding,
} from "@/types/storyworld-definition";
