import type { StoryWorldPreset } from "./storyworld";

/**
 * Shape of the adventurer.config.json file.
 * Both `profile` and `storyWorld` are optional — only provided fields
 * will pre-populate the setup wizard.
 */
export interface AdventurerConfig {
  profile?: {
    name?: string;
    gender?: string;
    age?: number;
    personality?: string;
    hobbies?: string[];
    coreValues?: string[];
    beliefSystems?: string[];
  };
  storyWorld?:
    | {
        /** Use a built-in preset by ID */
        preset: StoryWorldPreset;
      }
    | {
        /** Define a fully custom world */
        preset: "custom";
        name: string;
        description: string;
        tone?: string;
        ipReference?: string;
        themes?: string[];
      };
}
