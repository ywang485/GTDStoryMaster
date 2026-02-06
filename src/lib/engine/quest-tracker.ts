import type { Task } from "@/types/task";
import type { Scene, PlotStructure } from "@/types/story";

export interface Quest {
  sceneId: string;
  sceneTitle: string;
  taskIds: string[];
  isCompleted: boolean;
}

/**
 * Builds the quest list from plot structure, linking scenes to tasks.
 */
export function buildQuestList(plotStructure: PlotStructure): Quest[] {
  const quests: Quest[] = [];
  for (const act of plotStructure.acts) {
    for (const scene of act.scenes) {
      quests.push({
        sceneId: scene.id,
        sceneTitle: scene.title,
        taskIds: scene.associatedTaskIds,
        isCompleted: false,
      });
    }
  }
  return quests;
}

/**
 * Returns the current scene based on task completion state.
 * Finds the first scene whose associated tasks are not all completed.
 */
export function getCurrentScene(
  plotStructure: PlotStructure,
  completedTaskIds: string[],
): Scene | null {
  const completedSet = new Set(completedTaskIds);

  for (const act of plotStructure.acts) {
    for (const scene of act.scenes) {
      const allTasksDone = scene.associatedTaskIds.every((id) =>
        completedSet.has(id),
      );
      if (!allTasksDone) {
        return scene;
      }
    }
  }

  // All scenes done — return the last scene for the finale
  const lastAct = plotStructure.acts[plotStructure.acts.length - 1];
  const lastScene = lastAct?.scenes[lastAct.scenes.length - 1];
  return lastScene ?? null;
}

/**
 * Returns the active task (first non-completed task in the current task order).
 * Respects the task reordering from the AI's adjustedTaskOrder.
 */
export function getActiveTask(
  tasks: Task[],
  currentScene: Scene | null,
  completedTaskIds: string[],
): Task | null {
  if (!currentScene) return null;

  const completedSet = new Set(completedTaskIds);
  const sceneTaskIds = new Set(currentScene.associatedTaskIds);

  // Iterate through tasks in their current order (respects reordering)
  // Return the first task that belongs to this scene and isn't completed
  for (const task of tasks) {
    if (sceneTaskIds.has(task.id) && !completedSet.has(task.id)) {
      return task;
    }
  }

  return null;
}

/**
 * Calculates overall progress as a percentage.
 */
export function getProgress(
  tasks: Task[],
  completedTaskIds: string[],
): { completed: number; total: number; percentage: number } {
  const total = tasks.length;
  const completed = completedTaskIds.length;
  return {
    completed,
    total,
    percentage: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}
