export type StoryWorldPreset =
  | "fantasy-kingdom"
  | "space-station"
  | "detective-noir"
  | "custom";

export interface StoryWorld {
  id: string;
  name: string;
  preset: StoryWorldPreset;
  description: string;
  tone: string;
  ipReference?: string;
  setting: string;
  themes: string[];
  /** CSS theme identifier for adaptive visual styling (future) */
  themeId: string;
  /** Hints for future multimedia integration */
  mediaHints?: {
    ambientAudio?: string;
    sceneImageStyle?: string;
    voiceNarration?: boolean;
  };
}
