/**
 * StoryWorld System
 *
 * Interactive storyworld state machines for visual/audio presentation.
 * Definitions are schema-only; logic lives in executor subclasses.
 */

export { BaseStoryWorldExecutor } from "./base-storyworld-executor";
export type { PlacementMargin } from "./base-storyworld-executor";
export { StardewValleyExecutor } from "./examples/stardew-valley-executor";
export { FantasyWorldExecutor } from "./examples/fantasy-executor";

export { stardewValleyWorld } from "./examples/stardew-valley-world";
export { fantasyWorld } from "./examples/fantasy-world";

export type { StoryWorldRendererInterface } from "./renderer-interface";

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
  ActionResult,

  // Assets
  Asset,
  AssetType,
  AssetLibrary,
} from "@/types/storyworld-definition";
