/**
 * Migration utilities for converting between old Task format
 * and the new TodoList tool format
 */

import type { Task, TaskStatus, TaskPriority } from "@/types/task";
import type { ObjectInstance } from "./tool-interface";

/**
 * Convert old TaskStatus to new TodoTask status
 */
export function migrateTaskStatus(
  oldStatus: TaskStatus
): "pending" | "in_progress" | "completed" | "blocked" | "cancelled" {
  const statusMap: Record<TaskStatus, "pending" | "in_progress" | "completed" | "blocked" | "cancelled"> = {
    pending: "pending",
    active: "in_progress",  // Map "active" to "in_progress"
    completed: "completed",
    skipped: "cancelled"    // Map "skipped" to "cancelled"
  };

  return statusMap[oldStatus];
}

/**
 * Convert old TaskPriority (same format, but validate)
 */
export function migrateTaskPriority(
  priority: TaskPriority
): "low" | "medium" | "high" | "critical" {
  return priority; // Same format
}

/**
 * Convert old Task to TodoTask creation parameters
 */
export function convertTaskToTodoTaskParams(task: Task): {
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "critical";
  estimatedMinutes?: number;
  tags?: string[];
  dependencies?: string[];
} {
  const tags: string[] = [];

  // Add category as a tag if it exists
  if (task.category) {
    tags.push(task.category);
  }

  // Add aversiveness level as a tag (for story master context)
  if (task.aversiveness) {
    tags.push(`aversiveness-${task.aversiveness}`);
  }

  // Add cognitive load as a tag
  if (task.cognitiveLoad) {
    tags.push(`cognitive-load-${task.cognitiveLoad}`);
  }

  return {
    title: task.title,
    description: task.description,
    priority: migrateTaskPriority(task.priority),
    estimatedMinutes: task.estimatedMinutes,
    tags: tags.length > 0 ? tags : undefined,
    dependencies: task.dependencies.length > 0 ? task.dependencies : undefined
  };
}

/**
 * Convert TodoTask instance back to old Task format (for backwards compatibility)
 */
export function convertTodoTaskToTask(
  taskInstance: ObjectInstance
): Task {
  // Extract original category from tags
  const tags = (taskInstance.state.tags as string[] | undefined) ?? [];
  const categoryTag = tags.find(t => !t.startsWith("aversiveness-") && !t.startsWith("cognitive-load-"));

  // Extract aversiveness from tags
  const aversiveTag = tags.find(t => t.startsWith("aversiveness-"));
  const aversiveness = aversiveTag
    ? parseInt(aversiveTag.replace("aversiveness-", ""), 10)
    : undefined;

  // Extract cognitive load from tags
  const cognitiveTag = tags.find(t => t.startsWith("cognitive-load-"));
  const cognitiveLoad = cognitiveTag
    ? parseInt(cognitiveTag.replace("cognitive-load-", ""), 10)
    : undefined;

  // Map new status back to old status
  const newStatus = taskInstance.state.status as "pending" | "in_progress" | "completed" | "blocked" | "cancelled";
  const statusMap: Record<typeof newStatus, TaskStatus> = {
    pending: "pending",
    in_progress: "active",
    completed: "completed",
    blocked: "pending",  // Map blocked back to pending for old format
    cancelled: "skipped"
  };

  return {
    id: taskInstance.instanceId,
    title: taskInstance.state.title as string,
    description: taskInstance.state.description as string | undefined,
    priority: taskInstance.state.priority as TaskPriority,
    estimatedMinutes: taskInstance.state.estimatedMinutes as number | undefined,
    category: categoryTag,
    dependencies: (taskInstance.state.dependencies as string[] | undefined) ?? [],
    status: statusMap[newStatus],
    aversiveness,
    cognitiveLoad
  };
}

/**
 * Bulk migration helper - convert array of old tasks to tool-compatible format
 */
export function migrateTasksToTodoList(tasks: Task[]): Array<{
  title: string;
  description?: string;
  priority?: "low" | "medium" | "high" | "critical";
  estimatedMinutes?: number;
  tags?: string[];
  dependencies?: string[];
}> {
  return tasks.map(convertTaskToTodoTaskParams);
}

/**
 * Get all tasks from tool state in old Task format
 */
export function extractTasksFromToolState(
  toolInstances: Map<string, ObjectInstance>
): Task[] {
  const tasks: Task[] = [];

  for (const [id, instance] of toolInstances) {
    if (instance.typeName === "TodoTask") {
      tasks.push(convertTodoTaskToTask(instance));
    }
  }

  return tasks;
}

/**
 * Helper to get task order from TodoList root instance
 */
export function getTaskOrderFromTool(
  toolInstances: Map<string, ObjectInstance>
): string[] {
  const rootInstance = toolInstances.get("todolist-root");
  if (!rootInstance) {
    return [];
  }

  return (rootInstance.state.taskOrder as string[] | undefined) ?? [];
}

/**
 * Helper to get tasks in order
 */
export function getOrderedTasksFromTool(
  toolInstances: Map<string, ObjectInstance>
): Task[] {
  const taskOrder = getTaskOrderFromTool(toolInstances);
  const allTasks = extractTasksFromToolState(toolInstances);

  // Create a map for quick lookup
  const taskMap = new Map(allTasks.map(t => [t.id, t]));

  // Return tasks in order
  return taskOrder.map(id => taskMap.get(id)).filter((t): t is Task => t !== undefined);
}
