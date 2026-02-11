import { z } from "zod";

// Tool call schema for TodoList operations
const todoListToolCallSchema = z.discriminatedUnion("operation", [
  z.object({
    operation: z.literal("updateTaskStatus"),
    params: z.object({
      taskId: z.string().describe("ID of the task to update"),
      status: z
        .enum(["pending", "in_progress", "completed", "cancelled"])
        .describe("New status for the task"),
    }),
  }),
  z.object({
    operation: z.literal("reorderTasks"),
    params: z.object({
      taskIds: z
        .array(z.string())
        .describe(
          "Complete ordered list of all task IDs in the desired order",
        ),
    }),
  }),
  z.object({
    operation: z.literal("addTask"),
    params: z.object({
      title: z.string().describe("Title of the new task"),
      description: z
        .string()
        .optional()
        .describe("Optional description of the task"),
    }),
  }),
  z.object({
    operation: z.literal("deleteTask"),
    params: z.object({
      taskId: z.string().describe("ID of the task to delete"),
    }),
  }),
]);

export const narrateResponseSchema = z.object({
  storyText: z.string().describe("The story text to display to the player"),
  toolCalls: z
    .array(todoListToolCallSchema)
    .optional()
    .describe(
      "Optional tool calls to update task state. Use TodoList operations to mark tasks completed, reorder tasks, add new tasks, or delete tasks based on the player's actions and story progression.",
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
  explanation: z
    .string()
    .describe("Concise explanation of the current story in 1-2 sentences"),
});

export type NarrateResponse = z.infer<typeof narrateResponseSchema>;
export type TodoListToolCall = z.infer<typeof todoListToolCallSchema>;
