import { streamText } from "ai";
import { getNarrationModel } from "@/lib/ai/provider";
import { buildNarratorSystemPrompt } from "@/lib/ai/prompts/narrator";
import { buildActionResponsePrompt } from "@/lib/ai/prompts/responder";
import { aiConfig } from "@/config/ai";
import type { PlayerAction } from "@/types/game";
import type { PlayerProfile, CharacterSheet } from "@/types/player";
import type { StoryWorld } from "@/types/storyworld";
import type { PlotStructure, Scene } from "@/types/story";

export async function POST(req: Request) {
  const body = await req.json();
  const {
    action,
    currentScene,
    profile,
    character,
    storyWorld,
    plotStructure,
  } = body as {
    action: PlayerAction;
    currentScene: Scene;
    profile: PlayerProfile;
    character: CharacterSheet | null;
    storyWorld: StoryWorld;
    plotStructure: PlotStructure;
  };

  // Build a minimal turn context for the narrator system prompt
  const turnContext = {
    turnNumber: 0,
    currentScene,
    tasksState: [],
    plotSoFar: [],
    playerInput: action.content,
    environment: {
      currentTime: new Date().toLocaleTimeString(),
    },
  };

  const systemPrompt = buildNarratorSystemPrompt(
    turnContext,
    profile,
    character,
    storyWorld,
    plotStructure,
  );

  const actionPrompt = buildActionResponsePrompt(action, currentScene);

  const result = streamText({
    model: getNarrationModel(),
    temperature: aiConfig.narrationTemperature,
    system: systemPrompt,
    prompt: actionPrompt,
  });

  return result.toTextStreamResponse();
}
