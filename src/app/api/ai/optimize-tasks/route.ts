import { generateObject } from "ai";
import { getStructuredModel } from "@/lib/ai/provider";
import { buildTaskOptimizerPrompt } from "@/lib/ai/prompts/task-optimizer";
import { optimizedTasksResponseSchema } from "@/lib/ai/schemas/optimized-tasks";
import { aiConfig } from "@/config/ai";
import type { Task } from "@/types/task";
import type { PlayerProfile } from "@/types/player";
import type { StoryWorld } from "@/types/storyworld";

export async function POST(req: Request) {
  const body = await req.json();
  const { tasks, profile, storyWorld } = body as {
    tasks: Task[];
    profile: PlayerProfile;
    storyWorld: StoryWorld;
  };

  const { system, user } = buildTaskOptimizerPrompt(
    tasks,
    profile,
    storyWorld,
  );

  const result = await generateObject({
    model: getStructuredModel(),
    temperature: aiConfig.structuredTemperature,
    system,
    prompt: user,
    schema: optimizedTasksResponseSchema,
  });

  return Response.json(result.object);
}
