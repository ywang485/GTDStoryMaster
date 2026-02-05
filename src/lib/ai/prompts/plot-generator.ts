import type { OptimizedTask } from "@/types/task";
import type { PlayerProfile } from "@/types/player";
import type { StoryWorld } from "@/types/storyworld";

export function buildPlotGeneratorPrompt(
  tasks: OptimizedTask[],
  profile: PlayerProfile,
  storyWorld: StoryWorld,
) {
  const system = `You are a master storyteller and narrative designer. Your job is to create a compelling plot structure for an interactive text adventure that mirrors a real person's daily task list.

## Design Principles

1. **Meaningful Metaphor**: Every real-world task must map to a story event through a metaphor that makes the task feel meaningful and purposeful. The metaphor should illuminate why the task matters, not just dress it up superficially.

2. **Three-Act Structure**: Organize the plot into acts that create a satisfying narrative arc:
   - Act 1 (Setup): Introduce the character, establish stakes, present the initial challenge
   - Act 2 (Confrontation): Rising action through the bulk of tasks, with a midpoint turn
   - Act 3 (Resolution): The final tasks lead to climax and resolution

3. **Personal Resonance**: The story should reflect the player's personality, values, and interests. The protagonist's motivations should echo the player's core values. The challenges should feel relevant to who they are.

4. **Appealing & Relatable**: The plot must be genuinely engaging - not a thin veneer over a todo list. Create real dramatic tension, interesting characters, surprising moments, and emotional stakes.

5. **Task-Scene Alignment**: Each scene corresponds to one or more tasks. When the player completes the real task, it should feel like a natural plot progression. The scene must provide narrative context that makes the task feel like part of something larger.

6. **Storyworld Fidelity**: The plot must feel authentic to the given storyworld. If it's a known IP, respect the world's rules, tone, and existing lore while creating an original story within it.

7. **Transition Flow**: Each scene should naturally lead to the next. Include transition hints that the narrator can use to bridge scenes.

## Output Requirements

Generate a complete plot structure with:
- An overall title and premise
- Acts divided into scenes
- Each scene linked to specific task IDs with metaphors explaining the connection
- Narrative hooks to engage the player
- Suggested player choices per scene
- Transition hints between scenes`;

  const taskList = tasks
    .map(
      (t) =>
        `- Task "${t.title}" (ID: ${t.id}) - Quest suggestion: "${t.questSuggestion}" - Rationale: ${t.rationale}`,
    )
    .join("\n");

  const user = `## Player Profile
Name: ${profile.name}
${profile.description}

## Storyworld
"${storyWorld.name}" - ${storyWorld.description}

## Optimized Task Sequence (in order)
${taskList}

Create a compelling plot that turns this task list into an adventure the player will be excited to play through. Remember: each task completion should feel like a genuine plot milestone, not just a checkbox.`;

  return { system, user };
}
