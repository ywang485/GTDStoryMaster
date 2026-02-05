import type { PlayerProfile, CharacterSheet } from "./player";
import type { StoryWorld } from "./storyworld";
import type { Task, OptimizedTask } from "./task";
import type { PlotStructure, NarrativeEntry, Scene } from "./story";

export type GamePhase =
  | "setup"
  | "preparing"
  | "playing"
  | "paused"
  | "completed";

export interface EnvironmentContext {
  currentTime: string;
  weather?: string;
  mood?: string;
}

export interface TurnContext {
  turnNumber: number;
  currentScene: Scene;
  tasksState: Task[];
  plotSoFar: NarrativeEntry[];
  playerInput: string;
  environment: EnvironmentContext;
}

export interface PlayerAction {
  type: "choice" | "freetext" | "complete_task" | "skip_task";
  content: string;
  sceneId: string;
  taskId?: string;
}

export interface GameSession {
  id: string;
  createdAt: number;
  playerProfile: PlayerProfile;
  character: CharacterSheet | null;
  storyWorld: StoryWorld;
  rawTasks: Task[];
  optimizedTasks: OptimizedTask[] | null;
  plotStructure: PlotStructure | null;
  phase: GamePhase;
  currentSceneIndex: number;
  narrativeLog: NarrativeEntry[];
  completedTaskIds: string[];
  turnCount: number;
  environment: EnvironmentContext;
}

export interface Memory {
  pastSessions: {
    date: string;
    tasksCompleted: number;
    totalTasks: number;
    storyWorldUsed: string;
    highlights: string[];
  }[];
  productivityPatterns: {
    bestTimeOfDay: string;
    averageTasksPerDay: number;
    streakDays: number;
    commonCategories: string[];
  };
  userPreferences: {
    favoriteGenres: string[];
    narrativeStyle: string;
    difficultyPreference: string;
  };
}
