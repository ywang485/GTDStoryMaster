/**
 * Example Tool Implementation: Todo List
 *
 * The Todo List tool manages:
 * - A root "TodoList" object (singleton) managing the overall list
 * - Multiple "TodoTask" objects representing individual tasks
 *
 * Exogenous Actions:
 * - TodoList.createTask(): Create a new task
 * - TodoList.reorderTasks(): Change task order
 * - TodoList.clearCompleted(): Remove completed tasks
 * - TodoList.getStats(): Get list statistics
 * - TodoTask.updateStatus(): Change task status
 * - TodoTask.updateDetails(): Update task information
 * - TodoTask.delete(): Remove the task
 *
 * Public States:
 * - TodoList: totalTasks, completedTasks, activeTasks, taskOrder
 * - TodoTask: title, description, status, priority, dueDate, tags,
 *             createdAt, completedAt, estimatedMinutes, actualMinutes
 */

import { z } from 'zod';
import {
  ToolMetadata,
  ToolIOSpecification,
  ToolState,
  ObjectInstance,
  ActionContext,
  ActionResult,
  createToolDefinition
} from '../tool-interface';
import { BaseToolExecutor } from '../base-tool-executor';
import {
  publicState,
  privateState,
  readonlyState,
  computedState,
  param,
  optionalParam,
  exogenousAction,
  objectType
} from '../tool-helpers';

// ============================================================================
// Schemas
// ============================================================================

const TaskStatusSchema = z.enum(['pending', 'in_progress', 'completed', 'blocked', 'cancelled']);

const TaskPrioritySchema = z.enum(['low', 'medium', 'high', 'critical']);

const TaskTagsSchema = z.array(z.string());

const TaskDetailsSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: TaskPrioritySchema.optional(),
  dueDate: z.date().optional(),
  tags: TaskTagsSchema.optional(),
  estimatedMinutes: z.number().min(0).optional(),
  dependencies: z.array(z.string()).optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

const ListConfigSchema = z.object({
  autoArchiveCompleted: z.boolean(),
  defaultPriority: TaskPrioritySchema,
  enableDependencies: z.boolean(),
  maxActiveTasks: z.number().min(1).max(100).optional()
});

const ToolInputSchema = z.object({
  config: ListConfigSchema.optional(),
  initialTasks: z.array(TaskDetailsSchema).optional()
});

const ToolOutputSchema = z.object({
  totalTasks: z.number(),
  completedTasks: z.number(),
  activeTasks: z.number(),
  pendingTasks: z.number(),
  totalTimeSpent: z.number().describe('Total time spent in minutes'),
  completionRate: z.number().describe('Percentage of tasks completed'),
  averageCompletionTime: z.number().describe('Average time to complete tasks in minutes')
});

const TaskStatsSchema = z.object({
  byStatus: z.record(TaskStatusSchema, z.number()),
  byPriority: z.record(TaskPrioritySchema, z.number()),
  totalEstimatedTime: z.number(),
  totalActualTime: z.number(),
  overdueTasks: z.number(),
  blockedTasks: z.number()
});

// ============================================================================
// State Variables
// ============================================================================

const defaultConfig = {
  autoArchiveCompleted: false,
  defaultPriority: 'medium' as const,
  enableDependencies: true
};

const todoListStateVariables = [
  publicState('config', ListConfigSchema, defaultConfig, 'List configuration settings'),
  computedState('totalTasks', z.number(),
    (ts: ToolState) => Array.from(ts.instances.values()).filter(i => i.typeName === 'TodoTask').length,
    'Total number of tasks'),
  computedState('completedTasks', z.number(),
    (ts: ToolState) => Array.from(ts.instances.values()).filter(i => i.typeName === 'TodoTask' && i.state.status === 'completed').length,
    'Number of completed tasks'),
  computedState('activeTasks', z.number(),
    (ts: ToolState) => Array.from(ts.instances.values()).filter(i => i.typeName === 'TodoTask' && i.state.status === 'in_progress').length,
    'Number of active (in-progress) tasks'),
  computedState('pendingTasks', z.number(),
    (ts: ToolState) => Array.from(ts.instances.values()).filter(i => i.typeName === 'TodoTask' && i.state.status === 'pending').length,
    'Number of pending tasks'),
  publicState('taskOrder', z.array(z.string()), [], 'Ordered list of task IDs'),
  readonlyState('archivedTaskIds', z.array(z.string()), [], 'IDs of archived tasks'),
  readonlyState('lastModified', z.date(), new Date(), 'Timestamp of last modification'),
];

const todoTaskStateVariables = [
  publicState('title', z.string(), '', 'Task title'),
  publicState('description', z.string().optional(), undefined, 'Task description'),
  publicState('status', TaskStatusSchema, 'pending', 'Current task status'),
  publicState('priority', TaskPrioritySchema, 'medium', 'Task priority level'),
  publicState('dueDate', z.date().nullable(), null, 'Task due date'),
  publicState('tags', TaskTagsSchema, [], 'Task tags for categorization'),
  publicState('estimatedMinutes', z.number().nullable(), null, 'Estimated time to complete (minutes)'),
  publicState('actualMinutes', z.number().nullable(), null, 'Actual time spent (minutes)'),
  publicState('dependencies', z.array(z.string()), [], 'Task IDs this task depends on'),
  publicState('createdAt', z.date(), new Date(), 'Task creation timestamp'),
  publicState('startedAt', z.date().nullable(), null, 'When task was started'),
  publicState('completedAt', z.date().nullable(), null, 'When task was completed'),
  privateState('metadata', z.record(z.string(), z.unknown()), {}, 'Additional metadata'),
];

// ============================================================================
// Actions
// ============================================================================

const todoListActions = [
  exogenousAction('createTask', {
    description: 'Create a new task in the list',
    params: [
      param('title', z.string().min(1), true, 'Task title'),
      optionalParam('description', z.string(), undefined, 'Task description'),
      optionalParam('priority', TaskPrioritySchema, undefined, 'Task priority'),
      optionalParam('dueDate', z.date(), undefined, 'Due date for the task'),
      optionalParam('tags', TaskTagsSchema, undefined, 'Tags for categorization'),
      optionalParam('estimatedMinutes', z.number(), undefined, 'Estimated time in minutes'),
      optionalParam('dependencies', z.array(z.string()), undefined, 'IDs of tasks this depends on'),
    ],
    affects: ['taskOrder', 'lastModified'],
    returns: z.object({ taskId: z.string(), title: z.string(), status: TaskStatusSchema, createdAt: z.date() })
  }),
  exogenousAction('reorderTasks', {
    description: 'Change the order of tasks in the list',
    params: [param('taskIds', z.array(z.string()), true, 'New ordered list of task IDs')],
    affects: ['taskOrder', 'lastModified'],
    returns: z.object({ success: z.boolean(), newOrder: z.array(z.string()) })
  }),
  exogenousAction('clearCompleted', {
    description: 'Remove all completed tasks from the list',
    params: [optionalParam('archive', z.boolean(), true, 'Whether to archive or permanently delete')],
    affects: ['taskOrder', 'archivedTaskIds', 'lastModified'],
    returns: z.object({ success: z.boolean(), removedCount: z.number(), archived: z.boolean() })
  }),
  exogenousAction('getStats', {
    description: 'Get statistics about the todo list',
    returns: TaskStatsSchema
  }),
  exogenousAction('configure', {
    description: 'Update list configuration',
    params: [param('config', ListConfigSchema.partial(), true, 'New configuration settings')],
    affects: ['config', 'lastModified'],
    returns: z.object({ success: z.boolean(), newConfig: ListConfigSchema })
  }),
];

const todoTaskActions = [
  exogenousAction('updateStatus', {
    description: 'Change the status of this task',
    params: [
      param('status', TaskStatusSchema, true, 'New task status'),
      optionalParam('actualMinutes', z.number(), undefined, 'Actual time spent (if completing)'),
    ],
    affects: ['status', 'startedAt', 'completedAt', 'actualMinutes'],
    returns: z.object({ success: z.boolean(), oldStatus: TaskStatusSchema, newStatus: TaskStatusSchema, timestamp: z.date() })
  }),
  exogenousAction('updateDetails', {
    description: 'Update task information',
    params: [
      optionalParam('title', z.string().min(1), undefined, 'New task title'),
      optionalParam('description', z.string(), undefined, 'New task description'),
      optionalParam('priority', TaskPrioritySchema, undefined, 'New task priority'),
      optionalParam('dueDate', z.date(), undefined, 'New due date'),
      optionalParam('tags', TaskTagsSchema, undefined, 'New tags'),
      optionalParam('estimatedMinutes', z.number(), undefined, 'New time estimate'),
    ],
    affects: ['title', 'description', 'priority', 'dueDate', 'tags', 'estimatedMinutes'],
    returns: z.object({ success: z.boolean(), updatedFields: z.array(z.string()) })
  }),
  exogenousAction('delete', {
    description: 'Delete this task from the list',
    returns: z.object({ success: z.boolean(), deletedAt: z.date() })
  }),
];

// ============================================================================
// Object Types & Tool Definition
// ============================================================================

const todoListObjectType = objectType('TodoList', {
  description: 'Singleton root object managing the todo list',
  root: true,
  states: todoListStateVariables,
  actions: todoListActions,
});

const todoTaskObjectType = objectType('TodoTask', {
  description: 'Individual task instance',
  states: todoTaskStateVariables,
  actions: todoTaskActions,
});

const todoListMetadata: ToolMetadata = {
  name: 'todo-list',
  version: '1.0.0',
  description: 'Task management and todo list tracking',
  usageDescription: `The Todo List tool provides comprehensive task management capabilities.

**Input**: Accepts initial configuration and optional list of tasks
**Output**: Returns task statistics including completion rates, time tracking, and productivity metrics

**How to use**:
1. Create tasks with TodoList.createTask() - specify title, priority, due date, etc.
2. Update task status with TodoTask.updateStatus() as you work on them
3. Track time by providing actualMinutes when completing tasks
4. Organize tasks by reordering with TodoList.reorderTasks()
5. Get insights with TodoList.getStats()
6. Clean up completed tasks with TodoList.clearCompleted()

**Task Status Flow**:
pending → in_progress → completed
         ↓
       blocked → in_progress
         ↓
     cancelled

The tool tracks dependencies, estimates vs actual time, and provides detailed statistics.
Perfect for integrating real GTD-style task management into the story.`,
  author: 'GTD Story Master',
  tags: ['productivity', 'task-management', 'gtd', 'todo']
};

const todoListIO: ToolIOSpecification = {
  inputSchema: ToolInputSchema,
  outputSchema: ToolOutputSchema,
  inputDescription: 'Optional configuration and initial tasks to populate the list',
  outputDescription: 'Comprehensive task statistics and productivity metrics',
  exampleInput: {
    config: {
      autoArchiveCompleted: true,
      defaultPriority: 'medium',
      enableDependencies: true,
      maxActiveTasks: 5
    },
    initialTasks: [
      { title: 'Review project requirements', priority: 'high', estimatedMinutes: 30, tags: ['work', 'planning'] },
      { title: 'Write documentation', priority: 'medium', estimatedMinutes: 60, tags: ['work', 'documentation'] }
    ]
  },
  exampleOutput: {
    totalTasks: 10,
    completedTasks: 6,
    activeTasks: 2,
    pendingTasks: 2,
    totalTimeSpent: 240,
    completionRate: 60.0,
    averageCompletionTime: 40.0
  }
};

export const todoListToolDefinition = createToolDefinition(
  todoListMetadata,
  todoListIO,
  [todoListObjectType, todoTaskObjectType]
);

// ============================================================================
// Executor
// ============================================================================

export class TodoListToolExecutor extends BaseToolExecutor {
  constructor() {
    super(todoListToolDefinition, 'todolist-root');
  }

  async initialize(input: unknown): Promise<ToolState> {
    const parsed = ToolInputSchema.parse(input);

    this.createRootInstance('TodoList', {
      config: parsed.config ?? defaultConfig,
      taskOrder: [],
      archivedTaskIds: [],
      lastModified: new Date()
    });

    // Create initial tasks if provided
    if (parsed.initialTasks && parsed.initialTasks.length > 0) {
      for (const taskDetails of parsed.initialTasks) {
        await this.executeAction({
          instanceId: this.rootInstanceId,
          actionName: 'createTask',
          parameters: taskDetails,
          timestamp: new Date()
        });
      }
    }

    this.state.timestamp = new Date();
    return this.state;
  }

  // Override to also clean up taskOrder
  async destroyInstance(instanceId: string): Promise<boolean> {
    const instance = this.state.instances.get(instanceId);
    if (instance?.typeName === 'TodoTask') {
      const listInstance = this.state.instances.get(this.rootInstanceId);
      if (listInstance) {
        const taskOrder = listInstance.state.taskOrder as string[];
        listInstance.state.taskOrder = taskOrder.filter(id => id !== instanceId);
      }
    }
    return super.destroyInstance(instanceId);
  }

  // --- Action handlers (convention: action "createTask" → handleCreateTask) --

  protected async handleCreateTask(
    listInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const params = context.parameters as {
      title: string;
      description?: string;
      priority?: string;
      dueDate?: Date;
      tags?: string[];
      estimatedMinutes?: number;
      dependencies?: string[];
    };

    // Validate dependencies exist
    if (params.dependencies && params.dependencies.length > 0) {
      for (const depId of params.dependencies) {
        if (!this.state.instances.has(depId)) {
          return { success: false, error: `Dependency task ${depId} not found`, stateChanges: new Map() };
        }
      }
    }

    const taskId = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const config = listInstance.state.config as z.infer<typeof ListConfigSchema>;
    const now = new Date();

    const taskInstance: ObjectInstance = {
      instanceId: taskId,
      typeName: 'TodoTask',
      state: {
        title: params.title,
        description: params.description ?? null,
        status: 'pending',
        priority: params.priority ?? config.defaultPriority,
        dueDate: params.dueDate ?? null,
        tags: params.tags ?? [],
        estimatedMinutes: params.estimatedMinutes ?? null,
        actualMinutes: null,
        dependencies: params.dependencies ?? [],
        createdAt: now,
        startedAt: null,
        completedAt: null,
        metadata: {}
      },
      createdAt: now,
      updatedAt: now
    };

    this.state.instances.set(taskId, taskInstance);

    const stateChanges = new Map<string, unknown>();
    const taskOrder = listInstance.state.taskOrder as string[];
    taskOrder.push(taskId);

    listInstance.state.taskOrder = taskOrder;
    listInstance.state.lastModified = now;
    listInstance.updatedAt = now;

    stateChanges.set('taskOrder', taskOrder);
    stateChanges.set('lastModified', now);

    return {
      success: true,
      output: { taskId, title: params.title, status: 'pending', createdAt: now },
      stateChanges
    };
  }

  protected async handleReorderTasks(
    listInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const params = context.parameters as { taskIds: string[] };

    const currentOrder = listInstance.state.taskOrder as string[];
    const taskIdSet = new Set(currentOrder);

    for (const taskId of params.taskIds) {
      if (!taskIdSet.has(taskId)) {
        return { success: false, error: `Task ${taskId} not found in current order`, stateChanges: new Map() };
      }
    }

    if (params.taskIds.length !== currentOrder.length) {
      return { success: false, error: 'New order must include all current tasks', stateChanges: new Map() };
    }

    const now = new Date();
    const stateChanges = new Map<string, unknown>();

    listInstance.state.taskOrder = [...params.taskIds];
    listInstance.state.lastModified = now;
    listInstance.updatedAt = now;

    stateChanges.set('taskOrder', listInstance.state.taskOrder);
    stateChanges.set('lastModified', now);

    return {
      success: true,
      output: { success: true, newOrder: [...params.taskIds] },
      stateChanges
    };
  }

  protected async handleClearCompleted(
    listInstance: ObjectInstance,
    _context: ActionContext
  ): Promise<ActionResult> {
    const params = _context.parameters as { archive?: boolean };
    const archive = params.archive ?? true;

    const taskOrder = listInstance.state.taskOrder as string[];
    const completedTaskIds: string[] = [];

    for (const taskId of taskOrder) {
      const task = this.state.instances.get(taskId);
      if (task && task.state.status === 'completed') {
        completedTaskIds.push(taskId);
      }
    }

    const now = new Date();
    const stateChanges = new Map<string, unknown>();

    if (archive) {
      const archivedIds = listInstance.state.archivedTaskIds as string[];
      archivedIds.push(...completedTaskIds);
      listInstance.state.archivedTaskIds = archivedIds;
      stateChanges.set('archivedTaskIds', archivedIds);
    }

    for (const taskId of completedTaskIds) {
      this.state.instances.delete(taskId);
    }

    const newOrder = taskOrder.filter(id => !completedTaskIds.includes(id));
    listInstance.state.taskOrder = newOrder;
    listInstance.state.lastModified = now;
    listInstance.updatedAt = now;

    stateChanges.set('taskOrder', newOrder);
    stateChanges.set('lastModified', now);

    return {
      success: true,
      output: { success: true, removedCount: completedTaskIds.length, archived: archive },
      stateChanges
    };
  }

  protected async handleGetStats(
    listInstance: ObjectInstance,
    _context: ActionContext
  ): Promise<ActionResult> {
    const taskOrder = listInstance.state.taskOrder as string[];

    const stats = {
      byStatus: {} as Record<string, number>,
      byPriority: {} as Record<string, number>,
      totalEstimatedTime: 0,
      totalActualTime: 0,
      overdueTasks: 0,
      blockedTasks: 0
    };

    const now = new Date();

    for (const taskId of taskOrder) {
      const task = this.state.instances.get(taskId);
      if (!task) continue;

      const status = task.state.status as string;
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      const priority = task.state.priority as string;
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

      if (task.state.estimatedMinutes) {
        stats.totalEstimatedTime += task.state.estimatedMinutes as number;
      }
      if (task.state.actualMinutes) {
        stats.totalActualTime += task.state.actualMinutes as number;
      }

      if (task.state.dueDate && task.state.status !== 'completed') {
        const dueDate = task.state.dueDate as Date;
        if (dueDate < now) {
          stats.overdueTasks++;
        }
      }

      if (task.state.status === 'blocked') {
        stats.blockedTasks++;
      }
    }

    return { success: true, output: stats, stateChanges: new Map() };
  }

  protected async handleConfigure(
    listInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const params = context.parameters as { config: Partial<z.infer<typeof ListConfigSchema>> };

    const currentConfig = listInstance.state.config as z.infer<typeof ListConfigSchema>;
    const newConfig = { ...currentConfig, ...params.config };

    const result = ListConfigSchema.safeParse(newConfig);
    if (!result.success) {
      return { success: false, error: `Invalid configuration: ${result.error.message}`, stateChanges: new Map() };
    }

    const now = new Date();
    const stateChanges = new Map<string, unknown>();

    listInstance.state.config = result.data;
    listInstance.state.lastModified = now;
    listInstance.updatedAt = now;

    stateChanges.set('config', result.data);
    stateChanges.set('lastModified', now);

    return {
      success: true,
      output: { success: true, newConfig: result.data },
      stateChanges
    };
  }

  protected async handleUpdateStatus(
    taskInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const params = context.parameters as { status: string; actualMinutes?: number };

    const oldStatus = taskInstance.state.status as string;
    const newStatus = params.status;
    const now = new Date();

    const stateChanges = new Map<string, unknown>();

    taskInstance.state.status = newStatus;
    stateChanges.set('status', newStatus);

    if (newStatus === 'in_progress' && !taskInstance.state.startedAt) {
      taskInstance.state.startedAt = now;
      stateChanges.set('startedAt', now);
    }

    if (newStatus === 'completed') {
      taskInstance.state.completedAt = now;
      stateChanges.set('completedAt', now);

      if (params.actualMinutes !== undefined) {
        taskInstance.state.actualMinutes = params.actualMinutes;
        stateChanges.set('actualMinutes', params.actualMinutes);
      }
    }

    taskInstance.updatedAt = now;

    return {
      success: true,
      output: { success: true, oldStatus, newStatus, timestamp: now },
      stateChanges
    };
  }

  protected async handleUpdateDetails(
    taskInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const params = context.parameters as {
      title?: string;
      description?: string;
      priority?: string;
      dueDate?: Date;
      tags?: string[];
      estimatedMinutes?: number;
    };

    const now = new Date();
    const stateChanges = new Map<string, unknown>();
    const updatedFields: string[] = [];

    for (const field of ['title', 'description', 'priority', 'dueDate', 'tags', 'estimatedMinutes'] as const) {
      if (params[field] !== undefined) {
        taskInstance.state[field] = params[field];
        stateChanges.set(field, params[field]);
        updatedFields.push(field);
      }
    }

    taskInstance.updatedAt = now;

    return {
      success: true,
      output: { success: true, updatedFields },
      stateChanges
    };
  }

  protected async handleDelete(
    taskInstance: ObjectInstance,
    _context: ActionContext
  ): Promise<ActionResult> {
    const taskId = taskInstance.instanceId;
    const now = new Date();

    const listInstance = this.state.instances.get(this.rootInstanceId);
    if (listInstance) {
      const taskOrder = listInstance.state.taskOrder as string[];
      listInstance.state.taskOrder = taskOrder.filter(id => id !== taskId);
      listInstance.state.lastModified = now;
      listInstance.updatedAt = now;
    }

    this.state.instances.delete(taskId);

    return {
      success: true,
      output: { success: true, deletedAt: now },
      stateChanges: new Map()
    };
  }
}
