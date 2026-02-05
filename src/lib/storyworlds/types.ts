import type { StoryWorld } from "@/types/storyworld";

export type StoryWorldPresetData = Omit<StoryWorld, "id"> & { id: string };
