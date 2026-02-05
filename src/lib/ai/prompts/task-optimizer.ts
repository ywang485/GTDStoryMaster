import type { Task } from "@/types/task";
import type { PlayerProfile } from "@/types/player";
import type { StoryWorld } from "@/types/storyworld";
import type { Memory } from "@/types/game";

export function buildTaskOptimizerPrompt(
  tasks: Task[],
  profile: PlayerProfile,
  storyWorld: StoryWorld,
  memory?: Memory,
) {
  const system = `You are a productivity optimization expert and narrative designer. Your job is to reorder a list of real-world tasks for optimal productivity, while also suggesting how each task could map to an engaging story quest in the given storyworld.

## Productivity Principles to Apply

1. **Eat the Frog / Aversive Tasks Early**: Schedule tasks the user finds boring, aversive, or motivation-costly earlier in the day when willpower is highest. Use the aversiveness ratings if provided.

2. **Deep Work First**: Schedule tasks requiring high cognitive load during peak focus hours (typically morning). Batch shallow/administrative tasks together later.

3. **Minimize Context Switching**: Group related tasks together. Avoid alternating between very different task categories. Consider the cognitive cost of switching between different types of work.

4. **Respect Dependencies**: Tasks that depend on other tasks must come after their dependencies, regardless of other optimization criteria.

5. **Energy Management**: Create a rhythm of challenging and lighter tasks. Don't stack all heavy tasks back-to-back; intersperse with lighter ones to prevent burnout.

6. **Momentum Building**: Start with a task that provides a quick win if the user needs motivation, OR start with the hardest task if the user has strong morning energy.

7. **Batch Processing**: Group similar task types together (all emails, all writing, all coding) to reduce cognitive overhead.

## Story Quest Mapping Guidelines

For each task, suggest a quest name and brief metaphor that:
- Connects meaningfully to the task's real-world nature
- Fits naturally within the given storyworld's setting and tone
- Creates narrative tension or excitement
- Makes the task feel more meaningful and purposeful

## Output Requirements

Return the tasks reordered for optimal productivity, with rationale explaining the ordering decisions and quest suggestions for each task.`;

  const taskList = tasks
    .map(
      (t, i) =>
        `${i + 1}. "${t.title}"${t.description ? ` - ${t.description}` : ""}
   Priority: ${t.priority} | Est: ${t.estimatedMinutes ?? "unknown"} min | Category: ${t.category ?? "general"}
   Dependencies: ${t.dependencies.length > 0 ? t.dependencies.join(", ") : "none"}
   Aversiveness: ${t.aversiveness ?? "not rated"}/10 | Cognitive Load: ${t.cognitiveLoad ?? "not rated"}/10`,
    )
    .join("\n");

  const memoryContext = memory
    ? `
## User Productivity History
- Best time of day: ${memory.productivityPatterns.bestTimeOfDay}
- Average tasks/day: ${memory.productivityPatterns.averageTasksPerDay}
- Current streak: ${memory.productivityPatterns.streakDays} days
- Common categories: ${memory.productivityPatterns.commonCategories.join(", ")}`
    : "";

  const user = `## Player Profile
Name: ${profile.name}
${profile.description}
${memoryContext}

## Storyworld
"${storyWorld.name}" - ${storyWorld.description}

## Tasks to Optimize
${taskList}

Please reorder these tasks for optimal productivity and suggest quest mappings for each one.`;

  return { system, user };
}
