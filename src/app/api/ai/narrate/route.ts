import { streamText } from "ai";
import { getNarrationModel } from "@/lib/ai/provider";
import {
  buildNarratorSystemPrompt,
  buildTurnUserPrompt,
} from "@/lib/ai/prompts/narrator";
import { aiConfig } from "@/config/ai";
import type { TurnContext } from "@/types/game";
import type { PlayerProfile, CharacterSheet } from "@/types/player";
import type { StoryWorld } from "@/types/storyworld";
import type { PlotStructure } from "@/types/story";

export async function POST(req: Request) {
  const body = await req.json();
  const { turnContext, profile, character, storyWorld, plotStructure } =
    body as {
      turnContext: TurnContext;
      profile: PlayerProfile;
      character: CharacterSheet | null;
      storyWorld: StoryWorld;
      plotStructure: PlotStructure;
    };

  const systemPrompt = buildNarratorSystemPrompt(
    turnContext,
    profile,
    character,
    storyWorld,
    plotStructure,
  );

  const userPrompt = buildTurnUserPrompt(turnContext);

  // Use streamText and let the AI return JSON
  // The narrator prompt already specifies JSON output format
  const result = streamText({
    model: getNarrationModel(),
    temperature: aiConfig.narrationTemperature,
    system: systemPrompt,
    prompt: userPrompt,
  });

  return result.toTextStreamResponse();
}
