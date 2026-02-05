import { generateObject } from "ai";
import { getStructuredModel } from "@/lib/ai/provider";
import { buildPlotGeneratorPrompt } from "@/lib/ai/prompts/plot-generator";
import { plotStructureSchema } from "@/lib/ai/schemas/plot-structure";
import { aiConfig } from "@/config/ai";
import type { OptimizedTask } from "@/types/task";
import type { PlayerProfile } from "@/types/player";
import type { StoryWorld } from "@/types/storyworld";

export async function POST(req: Request) {
  const body = await req.json();
  const { tasks, profile, storyWorld } = body as {
    tasks: OptimizedTask[];
    profile: PlayerProfile;
    storyWorld: StoryWorld;
  };

  const { system, user } = buildPlotGeneratorPrompt(
    tasks,
    profile,
    storyWorld,
  );

  const result = await generateObject({
    model: getStructuredModel(),
    temperature: aiConfig.structuredTemperature,
    system,
    prompt: user,
    schema: plotStructureSchema,
  });

  return Response.json(result.object);
}
