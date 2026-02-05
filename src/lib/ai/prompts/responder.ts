import type { PlayerAction } from "@/types/game";
import type { Scene } from "@/types/story";

export function buildActionResponsePrompt(
  action: PlayerAction,
  currentScene: Scene,
) {
  return `The player has taken an action in scene "${currentScene.title}".

Action type: ${action.type}
Action: "${action.content}"
${action.taskId ? `Related task ID: ${action.taskId}` : ""}

${action.type === "complete_task" ? `The player has completed their real-world task! Create a triumphant narrative beat that resolves the current scene's challenge. Use the metaphor "${currentScene.metaphor}" to make the completion feel epic and meaningful. Then smoothly transition toward the next scene using: "${currentScene.transitionHint}"` : ""}

${action.type === "skip_task" ? `The player has chosen to skip this task. Acknowledge this gracefully within the narrative - perhaps the character finds an alternate path or decides to return to this challenge later. Don't be judgmental.` : ""}

${action.type === "choice" ? `The player chose one of the suggested actions. Narrate the consequence of this choice within the current scene. Keep the story moving and maintain tension.` : ""}

${action.type === "freetext" ? `The player typed a free-form response. Interpret their intent and respond naturally within the story context. If they're asking about their tasks or the story, break character briefly to help, then return to narration.` : ""}

Respond with 2-4 paragraphs of narration, ending with suggested next actions.`;
}
