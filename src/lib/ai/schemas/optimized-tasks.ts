import { z } from "zod";

export const optimizedTaskSchema = z.object({
  taskId: z.string().describe("The original task ID"),
  title: z.string().describe("The task title"),
  optimizedOrder: z.number().describe("The new position in the optimized order (1-based)"),
  rationale: z.string().describe("Why this task is placed at this position"),
  questSuggestion: z.string().describe("Suggested quest name in the storyworld"),
  estimatedMinutes: z.number().describe("Estimated time to complete in minutes"),
  storyRelevance: z.string().describe("How this task maps to a narrative element"),
});

export const optimizedTasksResponseSchema = z.object({
  orderedTasks: z.array(optimizedTaskSchema).describe("Tasks in optimized order"),
  overallRationale: z.string().describe("High-level explanation of the ordering strategy"),
  productivityTips: z.array(z.string()).describe("Specific productivity tips for this task set"),
});

export type OptimizedTasksResponse = z.infer<typeof optimizedTasksResponseSchema>;
