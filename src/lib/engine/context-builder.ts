import type { TurnContext, EnvironmentContext } from "@/types/game";
import type { Task } from "@/types/task";
import type { NarrativeEntry, Scene } from "@/types/story";
import { siteConfig } from "@/config/site";

/**
 * Builds the context object for an AI narration turn.
 * Assembles recent narrative, current scene, task state, and environment
 * into a structured context within token budget constraints.
 */
export function buildTurnContext(params: {
  turnNumber: number;
  currentScene: Scene;
  tasks: Task[];
  narrativeLog: NarrativeEntry[];
  playerInput: string;
  environment: EnvironmentContext;
}): TurnContext {
  const recentNarrative = params.narrativeLog.slice(
    -siteConfig.maxNarrativeContext,
  );

  return {
    turnNumber: params.turnNumber,
    currentScene: params.currentScene,
    tasksState: params.tasks,
    plotSoFar: recentNarrative,
    playerInput: params.playerInput,
    environment: params.environment,
  };
}

/**
 * Gets the current environment context (time, weather placeholder).
 */
export function getCurrentEnvironment(
  mood?: string,
  weather?: string,
): EnvironmentContext {
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return {
    currentTime: timeStr,
    weather: weather ?? undefined,
    mood: mood ?? undefined,
  };
}
