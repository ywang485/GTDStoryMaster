export type TaskPriority = "low" | "medium" | "high" | "critical";

export type TaskStatus = "pending" | "active" | "completed" | "skipped";

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: TaskPriority;
  estimatedMinutes?: number;
  category?: string;
  dependencies: string[];
  status: TaskStatus;
  /** 1-10: how aversive/boring this task feels */
  aversiveness?: number;
  /** 1-10: cognitive load required */
  cognitiveLoad?: number;
}

export interface OptimizedTask extends Task {
  originalIndex: number;
  optimizedOrder: number;
  rationale: string;
  questSuggestion: string;
}
