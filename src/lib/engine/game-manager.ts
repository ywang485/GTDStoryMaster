import type { GamePhase, PlayerAction } from "@/types/game";
import type { Task } from "@/types/task";
import type { PlotStructure, NarrativeEntry, Scene } from "@/types/story";
import { getCurrentScene, getActiveTask } from "./quest-tracker";

export interface GameStateUpdate {
  newPhase?: GamePhase;
  completedTaskId?: string;
  newSceneId?: string;
  taskStatusUpdates?: { taskId: string; status: Task["status"] }[];
  narrativeEntry?: NarrativeEntry;
}

/**
 * Processes a player action and determines what state changes should occur.
 * Pure function — does not mutate state or call APIs.
 */
export function processAction(
  action: PlayerAction,
  tasks: Task[],
  completedTaskIds: string[],
  plotStructure: PlotStructure,
  turnCount: number,
): GameStateUpdate {
  const update: GameStateUpdate = {};

  if (action.type === "complete_task" && action.taskId) {
    const task = tasks.find((t) => t.id === action.taskId);
    if (task && !completedTaskIds.includes(action.taskId)) {
      update.completedTaskId = action.taskId;
      update.taskStatusUpdates = [
        { taskId: action.taskId, status: "completed" },
      ];

      // Check if this completes the game
      const newCompleted = [...completedTaskIds, action.taskId];
      const allDone = tasks.every((t) => newCompleted.includes(t.id));
      if (allDone) {
        update.newPhase = "completed";
      } else {
        // Advance to next scene if current scene tasks are all done
        const currentScene = getCurrentScene(plotStructure, newCompleted);
        if (currentScene) {
          update.newSceneId = currentScene.id;

          // Set the next active task
          const nextTask = getActiveTask(tasks, currentScene, newCompleted);
          if (nextTask) {
            update.taskStatusUpdates.push({
              taskId: nextTask.id,
              status: "active",
            });
          }
        }
      }
    }
  }

  if (action.type === "skip_task" && action.taskId) {
    update.taskStatusUpdates = [
      { taskId: action.taskId, status: "skipped" },
    ];

    const newCompleted = [...completedTaskIds, action.taskId];
    const currentScene = getCurrentScene(plotStructure, newCompleted);
    if (currentScene) {
      update.newSceneId = currentScene.id;
    }
  }

  // Add the player's input as a narrative entry
  update.narrativeEntry = {
    id: `turn-${turnCount}-player`,
    role: "player",
    content: action.content,
    timestamp: Date.now(),
    sceneId: action.sceneId,
  };

  return update;
}

/**
 * Determines if all scenes in the plot are completed.
 */
export function isGameComplete(
  tasks: Task[],
  completedTaskIds: string[],
): boolean {
  return tasks.length > 0 && tasks.every((t) => completedTaskIds.includes(t.id));
}

/**
 * Gets all scenes as a flat ordered list.
 */
export function getAllScenes(plotStructure: PlotStructure): Scene[] {
  return plotStructure.acts.flatMap((act) => act.scenes);
}
