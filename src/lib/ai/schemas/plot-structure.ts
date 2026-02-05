import { z } from "zod";

const sceneSchema = z.object({
  id: z.string().describe("Unique scene identifier"),
  title: z.string().describe("Scene title"),
  description: z.string().describe("Brief scene description for context"),
  associatedTaskIds: z.array(z.string()).describe("IDs of tasks this scene covers"),
  metaphor: z.string().describe("How the real task maps to the story event"),
  narrativeHook: z.string().describe("Opening hook to engage the player"),
  suggestedChoices: z.array(z.string()).describe("2-4 action choices for the player"),
  transitionHint: z.string().describe("How to transition to the next scene"),
});

const actSchema = z.object({
  actNumber: z.number().describe("Act number (1, 2, or 3)"),
  title: z.string().describe("Act title"),
  description: z.string().describe("Brief description of this act's purpose"),
  scenes: z.array(sceneSchema).describe("Scenes within this act"),
});

export const plotStructureSchema = z.object({
  title: z.string().describe("The adventure's title"),
  premise: z.string().describe("1-2 sentence plot premise"),
  acts: z.array(actSchema).describe("The three acts of the story"),
  characterName: z.string().describe("The protagonist's in-world name"),
  characterRole: z.string().describe("The protagonist's role in the story"),
  characterBackstory: z.string().describe("Brief backstory for the protagonist"),
  characterTraits: z.array(z.string()).describe("Character traits reflecting the player"),
});

export type PlotStructureResponse = z.infer<typeof plotStructureSchema>;
