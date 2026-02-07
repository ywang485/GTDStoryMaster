import { z } from "zod";

const taskCompletionStateSchema = z.object({
  taskId: z.string().describe("ID of the task"),
  status: z
    .enum(["pending", "active", "completed", "skipped"])
    .describe("Updated status for this task"),
});

export const narrateResponseSchema = z.object({
  storyText: z.string().describe("The story text to display to the player"),
  updatedTaskCompletionState: z
    .array(taskCompletionStateSchema)
    .describe(
      "Task completion state after this turn; only include tasks whose status changed or are relevant",
    ),
  adjustedTaskOrder: z
    .array(z.string())
    .optional()
    .describe(
      "Optional reordered list of task IDs based on updated context, priorities, or productivity optimization. Only include if task order should be changed.",
    ),
  productivityObservation: z
    .string()
    .describe(
      "Observation on the user's behavior that could be useful for future conversations",
    ),
  exampleResponses: z
    .array(z.string())
    .optional()
    .describe(
      "Several example responses the user could give based on the current story and task progress",
    ),
  execution: z
    .string()
    .optional()
    .describe(
      "A string of HTML/JavaScript/CSS code to present the story, facilitate the current task, and help with productivity",
    ),
  explanation: z
    .string()
    .describe("Concise explanation of the current story in 1-2 sentences"),
});

export type NarrateResponse = z.infer<typeof narrateResponseSchema>;
export type TaskCompletionState = z.infer<typeof taskCompletionStateSchema>;
