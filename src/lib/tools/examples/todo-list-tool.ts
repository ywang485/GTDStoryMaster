/**
 * Example Tool Implementation: Todo List
 *
 * This demonstrates a todo list tool that can replace the current
 * task management functionality in GTD Story Master.
 *
 * The Todo List tool manages:
 * - A root "TodoList" object (singleton) managing the overall list
 * - Multiple "TodoTask" objects representing individual tasks
 *
 * Exogenous Actions (externally triggerable):
 * - TodoList.createTask(): Create a new task
 * - TodoList.reorderTasks(): Change task order
 * - TodoList.clearCompleted(): Remove completed tasks
 * - TodoList.getStats(): Get list statistics
 * - TodoTask.updateStatus(): Change task status
 * - TodoTask.updateDetails(): Update task information
 * - TodoTask.delete(): Remove the task
 *
 * Public States (for visualization):
 * - TodoList: totalTasks, completedTasks, activeTasks, taskOrder
 * - TodoTask: title, description, status, priority, dueDate, tags,
 *             createdAt, completedAt, estimatedMinutes, actualMinutes
 */

import { z } from 'zod';
import {
  ToolDefinition,
  ToolMetadata,
  ToolIOSpecification,
  ObjectTypeDefinition,
  StateVariable,
  ActionDefinition,
  ActionParameter,
  ToolExecutor,
  ToolState,
  ObjectInstance,
  ActionContext,
  ActionResult,
  createToolDefinition
} from '../tool-interface';

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
  dependencies: z.array(z.string()).optional(), // Task IDs this depends on
  metadata: z.record(z.unknown()).optional()
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
// State Variables - TodoList
// ============================================================================

const todoListStateVariables: StateVariable[] = [
  {
    name: 'config',
    description: 'List configuration settings',
    schema: ListConfigSchema,
    isPublic: true,
    initialValue: {
      autoArchiveCompleted: false,
      defaultPriority: 'medium',
      enableDependencies: true
    }
  },
  {
    name: 'totalTasks',
    description: 'Total number of tasks',
    schema: z.number(),
    isPublic: true,
    initialValue: 0
  },
  {
    name: 'completedTasks',
    description: 'Number of completed tasks',
    schema: z.number(),
    isPublic: true,
    initialValue: 0
  },
  {
    name: 'activeTasks',
    description: 'Number of active (in-progress) tasks',
    schema: z.number(),
    isPublic: true,
    initialValue: 0
  },
  {
    name: 'pendingTasks',
    description: 'Number of pending tasks',
    schema: z.number(),
    isPublic: true,
    initialValue: 0
  },
  {
    name: 'taskOrder',
    description: 'Ordered list of task IDs',
    schema: z.array(z.string()),
    isPublic: true,
    initialValue: []
  },
  {
    name: 'archivedTaskIds',
    description: 'IDs of archived tasks (internal)',
    schema: z.array(z.string()),
    isPublic: false,
    initialValue: [],
    isReadOnly: true
  },
  {
    name: 'lastModified',
    description: 'Timestamp of last modification (internal)',
    schema: z.date(),
    isPublic: false,
    initialValue: new Date(),
    isReadOnly: true
  }
];

// ============================================================================
// State Variables - TodoTask
// ============================================================================

const todoTaskStateVariables: StateVariable[] = [
  {
    name: 'title',
    description: 'Task title',
    schema: z.string(),
    isPublic: true,
    initialValue: ''
  },
  {
    name: 'description',
    description: 'Task description',
    schema: z.string().optional(),
    isPublic: true,
    initialValue: undefined
  },
  {
    name: 'status',
    description: 'Current task status',
    schema: TaskStatusSchema,
    isPublic: true,
    initialValue: 'pending'
  },
  {
    name: 'priority',
    description: 'Task priority level',
    schema: TaskPrioritySchema,
    isPublic: true,
    initialValue: 'medium'
  },
  {
    name: 'dueDate',
    description: 'Task due date (optional)',
    schema: z.date().nullable(),
    isPublic: true,
    initialValue: null
  },
  {
    name: 'tags',
    description: 'Task tags for categorization',
    schema: TaskTagsSchema,
    isPublic: true,
    initialValue: []
  },
  {
    name: 'estimatedMinutes',
    description: 'Estimated time to complete (minutes)',
    schema: z.number().nullable(),
    isPublic: true,
    initialValue: null
  },
  {
    name: 'actualMinutes',
    description: 'Actual time spent (minutes)',
    schema: z.number().nullable(),
    isPublic: true,
    initialValue: null
  },
  {
    name: 'dependencies',
    description: 'Task IDs this task depends on',
    schema: z.array(z.string()),
    isPublic: true,
    initialValue: []
  },
  {
    name: 'createdAt',
    description: 'Task creation timestamp',
    schema: z.date(),
    isPublic: true,
    initialValue: new Date()
  },
  {
    name: 'startedAt',
    description: 'When task was started (null if not started)',
    schema: z.date().nullable(),
    isPublic: true,
    initialValue: null
  },
  {
    name: 'completedAt',
    description: 'When task was completed (null if not completed)',
    schema: z.date().nullable(),
    isPublic: true,
    initialValue: null
  },
  {
    name: 'metadata',
    description: 'Additional metadata (internal)',
    schema: z.record(z.unknown()),
    isPublic: false,
    initialValue: {}
  }
];

// ============================================================================
// Action Parameters - TodoList
// ============================================================================

const createTaskParams: ActionParameter[] = [
  {
    name: 'title',
    description: 'Task title',
    schema: z.string().min(1),
    required: true
  },
  {
    name: 'description',
    description: 'Task description',
    schema: z.string(),
    required: false
  },
  {
    name: 'priority',
    description: 'Task priority',
    schema: TaskPrioritySchema,
    required: false
  },
  {
    name: 'dueDate',
    description: 'Due date for the task',
    schema: z.date(),
    required: false
  },
  {
    name: 'tags',
    description: 'Tags for categorization',
    schema: TaskTagsSchema,
    required: false
  },
  {
    name: 'estimatedMinutes',
    description: 'Estimated time in minutes',
    schema: z.number(),
    required: false
  },
  {
    name: 'dependencies',
    description: 'IDs of tasks this depends on',
    schema: z.array(z.string()),
    required: false
  }
];

const reorderTasksParams: ActionParameter[] = [
  {
    name: 'taskIds',
    description: 'New ordered list of task IDs',
    schema: z.array(z.string()),
    required: true
  }
];

const clearCompletedParams: ActionParameter[] = [
  {
    name: 'archive',
    description: 'Whether to archive or permanently delete',
    schema: z.boolean(),
    required: false,
    defaultValue: true
  }
];

const configureParams: ActionParameter[] = [
  {
    name: 'config',
    description: 'New configuration settings',
    schema: ListConfigSchema.partial(),
    required: true
  }
];

// ============================================================================
// Action Parameters - TodoTask
// ============================================================================

const updateStatusParams: ActionParameter[] = [
  {
    name: 'status',
    description: 'New task status',
    schema: TaskStatusSchema,
    required: true
  },
  {
    name: 'actualMinutes',
    description: 'Actual time spent (if completing)',
    schema: z.number(),
    required: false
  }
];

const updateDetailsParams: ActionParameter[] = [
  {
    name: 'title',
    description: 'New task title',
    schema: z.string().min(1),
    required: false
  },
  {
    name: 'description',
    description: 'New task description',
    schema: z.string(),
    required: false
  },
  {
    name: 'priority',
    description: 'New task priority',
    schema: TaskPrioritySchema,
    required: false
  },
  {
    name: 'dueDate',
    description: 'New due date',
    schema: z.date(),
    required: false
  },
  {
    name: 'tags',
    description: 'New tags',
    schema: TaskTagsSchema,
    required: false
  },
  {
    name: 'estimatedMinutes',
    description: 'New time estimate',
    schema: z.number(),
    required: false
  }
];

// ============================================================================
// Actions - TodoList
// ============================================================================

const todoListActions: ActionDefinition[] = [
  {
    name: 'createTask',
    description: 'Create a new task in the list',
    parameters: createTaskParams,
    isExogenous: true,
    affectedStates: ['totalTasks', 'pendingTasks', 'taskOrder', 'lastModified'],
    returnSchema: z.object({
      taskId: z.string(),
      title: z.string(),
      status: TaskStatusSchema,
      createdAt: z.date()
    })
  },
  {
    name: 'reorderTasks',
    description: 'Change the order of tasks in the list',
    parameters: reorderTasksParams,
    isExogenous: true,
    affectedStates: ['taskOrder', 'lastModified'],
    returnSchema: z.object({
      success: z.boolean(),
      newOrder: z.array(z.string())
    })
  },
  {
    name: 'clearCompleted',
    description: 'Remove all completed tasks from the list',
    parameters: clearCompletedParams,
    isExogenous: true,
    affectedStates: ['totalTasks', 'completedTasks', 'taskOrder', 'archivedTaskIds', 'lastModified'],
    returnSchema: z.object({
      success: z.boolean(),
      removedCount: z.number(),
      archived: z.boolean()
    })
  },
  {
    name: 'getStats',
    description: 'Get statistics about the todo list',
    parameters: [],
    isExogenous: true,
    affectedStates: [],
    returnSchema: TaskStatsSchema
  },
  {
    name: 'configure',
    description: 'Update list configuration',
    parameters: configureParams,
    isExogenous: true,
    affectedStates: ['config', 'lastModified'],
    returnSchema: z.object({
      success: z.boolean(),
      newConfig: ListConfigSchema
    })
  },
  {
    name: 'updateCounters',
    description: 'Internal action to recalculate task counters',
    parameters: [],
    isExogenous: false,
    affectedStates: ['totalTasks', 'completedTasks', 'activeTasks', 'pendingTasks']
  }
];

// ============================================================================
// Actions - TodoTask
// ============================================================================

const todoTaskActions: ActionDefinition[] = [
  {
    name: 'updateStatus',
    description: 'Change the status of this task',
    parameters: updateStatusParams,
    isExogenous: true,
    affectedStates: ['status', 'startedAt', 'completedAt', 'actualMinutes'],
    returnSchema: z.object({
      success: z.boolean(),
      oldStatus: TaskStatusSchema,
      newStatus: TaskStatusSchema,
      timestamp: z.date()
    })
  },
  {
    name: 'updateDetails',
    description: 'Update task information',
    parameters: updateDetailsParams,
    isExogenous: true,
    affectedStates: ['title', 'description', 'priority', 'dueDate', 'tags', 'estimatedMinutes'],
    returnSchema: z.object({
      success: z.boolean(),
      updatedFields: z.array(z.string())
    })
  },
  {
    name: 'delete',
    description: 'Delete this task from the list',
    parameters: [],
    isExogenous: true,
    affectedStates: [],
    returnSchema: z.object({
      success: z.boolean(),
      deletedAt: z.date()
    })
  }
];

// ============================================================================
// Object Type Definitions
// ============================================================================

const todoListObjectType: ObjectTypeDefinition = {
  typeName: 'TodoList',
  description: 'Singleton root object managing the todo list',
  isRoot: true,
  states: todoListStateVariables,
  actions: todoListActions,
  maxInstances: 1
};

const todoTaskObjectType: ObjectTypeDefinition = {
  typeName: 'TodoTask',
  description: 'Individual task instance',
  isRoot: false,
  states: todoTaskStateVariables,
  actions: todoTaskActions
  // No maxInstances = unlimited
};

// ============================================================================
// Tool Definition
// ============================================================================

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
      {
        title: 'Review project requirements',
        priority: 'high',
        estimatedMinutes: 30,
        tags: ['work', 'planning']
      },
      {
        title: 'Write documentation',
        priority: 'medium',
        estimatedMinutes: 60,
        tags: ['work', 'documentation']
      }
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

export const todoListToolDefinition: ToolDefinition = createToolDefinition(
  todoListMetadata,
  todoListIO,
  [todoListObjectType, todoTaskObjectType]
);

// ============================================================================
// Tool Executor Implementation
// ============================================================================

export class TodoListToolExecutor implements ToolExecutor {
  definition: ToolDefinition;
  private state: ToolState;
  private rootInstanceId = 'todolist-root';

  constructor() {
    this.definition = todoListToolDefinition;
    this.state = {
      toolName: todoListMetadata.name,
      timestamp: new Date(),
      instances: new Map()
    };
  }

  async initialize(input: unknown): Promise<ToolState> {
    const parsed = ToolInputSchema.parse(input);

    // Create root TodoList instance
    const rootInstance: ObjectInstance = {
      instanceId: this.rootInstanceId,
      typeName: 'TodoList',
      state: {
        config: parsed.config ?? todoListStateVariables[0].initialValue,
        totalTasks: 0,
        completedTasks: 0,
        activeTasks: 0,
        pendingTasks: 0,
        taskOrder: [],
        archivedTaskIds: [],
        lastModified: new Date()
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.state.instances.set(this.rootInstanceId, rootInstance);

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

  async executeAction(context: ActionContext): Promise<ActionResult> {
    const instance = this.state.instances.get(context.instanceId);
    if (!instance) {
      return {
        success: false,
        error: `Instance ${context.instanceId} not found`,
        stateChanges: new Map()
      };
    }

    // Route based on instance type and action
    if (instance.typeName === 'TodoList') {
      return this.executeTodoListAction(instance, context);
    } else if (instance.typeName === 'TodoTask') {
      return this.executeTodoTaskAction(instance, context);
    }

    return {
      success: false,
      error: `Unknown instance type: ${instance.typeName}`,
      stateChanges: new Map()
    };
  }

  private async executeTodoListAction(
    listInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    switch (context.actionName) {
      case 'createTask':
        return this.handleCreateTask(listInstance, context);
      case 'reorderTasks':
        return this.handleReorderTasks(listInstance, context);
      case 'clearCompleted':
        return this.handleClearCompleted(listInstance, context);
      case 'getStats':
        return this.handleGetStats(listInstance, context);
      case 'configure':
        return this.handleConfigure(listInstance, context);
      default:
        return {
          success: false,
          error: `Unknown TodoList action: ${context.actionName}`,
          stateChanges: new Map()
        };
    }
  }

  private async executeTodoTaskAction(
    taskInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    switch (context.actionName) {
      case 'updateStatus':
        return this.handleUpdateStatus(taskInstance, context);
      case 'updateDetails':
        return this.handleUpdateDetails(taskInstance, context);
      case 'delete':
        return this.handleDeleteTask(taskInstance, context);
      default:
        return {
          success: false,
          error: `Unknown TodoTask action: ${context.actionName}`,
          stateChanges: new Map()
        };
    }
  }

  private async handleCreateTask(
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
          return {
            success: false,
            error: `Dependency task ${depId} not found`,
            stateChanges: new Map()
          };
        }
      }
    }

    // Create task instance
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

    // Update list state
    const stateChanges = new Map<string, unknown>();
    const taskOrder = listInstance.state.taskOrder as string[];
    taskOrder.push(taskId);

    listInstance.state.totalTasks = (listInstance.state.totalTasks as number) + 1;
    listInstance.state.pendingTasks = (listInstance.state.pendingTasks as number) + 1;
    listInstance.state.taskOrder = taskOrder;
    listInstance.state.lastModified = now;
    listInstance.updatedAt = now;

    stateChanges.set('totalTasks', listInstance.state.totalTasks);
    stateChanges.set('pendingTasks', listInstance.state.pendingTasks);
    stateChanges.set('taskOrder', taskOrder);
    stateChanges.set('lastModified', now);

    return {
      success: true,
      output: {
        taskId,
        title: params.title,
        status: 'pending',
        createdAt: now
      },
      stateChanges
    };
  }

  private async handleReorderTasks(
    listInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const params = context.parameters as { taskIds: string[] };

    // Validate all task IDs exist
    const currentOrder = listInstance.state.taskOrder as string[];
    const taskIdSet = new Set(currentOrder);

    for (const taskId of params.taskIds) {
      if (!taskIdSet.has(taskId)) {
        return {
          success: false,
          error: `Task ${taskId} not found in current order`,
          stateChanges: new Map()
        };
      }
    }

    // Check all current tasks are included
    if (params.taskIds.length !== currentOrder.length) {
      return {
        success: false,
        error: 'New order must include all current tasks',
        stateChanges: new Map()
      };
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
      output: {
        success: true,
        newOrder: [...params.taskIds]
      },
      stateChanges
    };
  }

  private async handleClearCompleted(
    listInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const params = context.parameters as { archive?: boolean };
    const archive = params.archive ?? true;

    const taskOrder = listInstance.state.taskOrder as string[];
    const completedTaskIds: string[] = [];

    // Find all completed tasks
    for (const taskId of taskOrder) {
      const task = this.state.instances.get(taskId);
      if (task && task.state.status === 'completed') {
        completedTaskIds.push(taskId);
      }
    }

    const now = new Date();
    const stateChanges = new Map<string, unknown>();

    // Remove or archive completed tasks
    if (archive) {
      const archivedIds = listInstance.state.archivedTaskIds as string[];
      archivedIds.push(...completedTaskIds);
      listInstance.state.archivedTaskIds = archivedIds;
      stateChanges.set('archivedTaskIds', archivedIds);
    }

    // Remove from instances
    for (const taskId of completedTaskIds) {
      this.state.instances.delete(taskId);
    }

    // Update task order
    const newOrder = taskOrder.filter(id => !completedTaskIds.includes(id));
    listInstance.state.taskOrder = newOrder;
    listInstance.state.totalTasks = (listInstance.state.totalTasks as number) - completedTaskIds.length;
    listInstance.state.completedTasks = (listInstance.state.completedTasks as number) - completedTaskIds.length;
    listInstance.state.lastModified = now;
    listInstance.updatedAt = now;

    stateChanges.set('taskOrder', newOrder);
    stateChanges.set('totalTasks', listInstance.state.totalTasks);
    stateChanges.set('completedTasks', listInstance.state.completedTasks);
    stateChanges.set('lastModified', now);

    return {
      success: true,
      output: {
        success: true,
        removedCount: completedTaskIds.length,
        archived: archive
      },
      stateChanges
    };
  }

  private async handleGetStats(
    listInstance: ObjectInstance,
    context: ActionContext
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

      // Count by status
      const status = task.state.status as string;
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;

      // Count by priority
      const priority = task.state.priority as string;
      stats.byPriority[priority] = (stats.byPriority[priority] || 0) + 1;

      // Sum time estimates
      if (task.state.estimatedMinutes) {
        stats.totalEstimatedTime += task.state.estimatedMinutes as number;
      }
      if (task.state.actualMinutes) {
        stats.totalActualTime += task.state.actualMinutes as number;
      }

      // Count overdue tasks
      if (task.state.dueDate && task.state.status !== 'completed') {
        const dueDate = task.state.dueDate as Date;
        if (dueDate < now) {
          stats.overdueTasks++;
        }
      }

      // Count blocked tasks
      if (task.state.status === 'blocked') {
        stats.blockedTasks++;
      }
    }

    return {
      success: true,
      output: stats,
      stateChanges: new Map()
    };
  }

  private async handleConfigure(
    listInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const params = context.parameters as { config: Partial<z.infer<typeof ListConfigSchema>> };

    const currentConfig = listInstance.state.config as z.infer<typeof ListConfigSchema>;
    const newConfig = { ...currentConfig, ...params.config };

    // Validate new config
    const result = ListConfigSchema.safeParse(newConfig);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid configuration: ${result.error.message}`,
        stateChanges: new Map()
      };
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
      output: {
        success: true,
        newConfig: result.data
      },
      stateChanges
    };
  }

  private async handleUpdateStatus(
    taskInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const params = context.parameters as {
      status: string;
      actualMinutes?: number;
    };

    const oldStatus = taskInstance.state.status as string;
    const newStatus = params.status;
    const now = new Date();

    const stateChanges = new Map<string, unknown>();

    taskInstance.state.status = newStatus;
    stateChanges.set('status', newStatus);

    // Update timestamps based on status
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

    // Update list counters
    await this.updateListCounters();

    return {
      success: true,
      output: {
        success: true,
        oldStatus,
        newStatus,
        timestamp: now
      },
      stateChanges
    };
  }

  private async handleUpdateDetails(
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

    // Update each provided field
    if (params.title !== undefined) {
      taskInstance.state.title = params.title;
      stateChanges.set('title', params.title);
      updatedFields.push('title');
    }

    if (params.description !== undefined) {
      taskInstance.state.description = params.description;
      stateChanges.set('description', params.description);
      updatedFields.push('description');
    }

    if (params.priority !== undefined) {
      taskInstance.state.priority = params.priority;
      stateChanges.set('priority', params.priority);
      updatedFields.push('priority');
    }

    if (params.dueDate !== undefined) {
      taskInstance.state.dueDate = params.dueDate;
      stateChanges.set('dueDate', params.dueDate);
      updatedFields.push('dueDate');
    }

    if (params.tags !== undefined) {
      taskInstance.state.tags = params.tags;
      stateChanges.set('tags', params.tags);
      updatedFields.push('tags');
    }

    if (params.estimatedMinutes !== undefined) {
      taskInstance.state.estimatedMinutes = params.estimatedMinutes;
      stateChanges.set('estimatedMinutes', params.estimatedMinutes);
      updatedFields.push('estimatedMinutes');
    }

    taskInstance.updatedAt = now;

    return {
      success: true,
      output: {
        success: true,
        updatedFields
      },
      stateChanges
    };
  }

  private async handleDeleteTask(
    taskInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const taskId = taskInstance.instanceId;
    const now = new Date();

    // Remove from list's task order
    const listInstance = this.state.instances.get(this.rootInstanceId);
    if (listInstance) {
      const taskOrder = listInstance.state.taskOrder as string[];
      const newOrder = taskOrder.filter(id => id !== taskId);
      listInstance.state.taskOrder = newOrder;
      listInstance.state.totalTasks = (listInstance.state.totalTasks as number) - 1;
      listInstance.state.lastModified = now;
      listInstance.updatedAt = now;
    }

    // Delete the instance
    this.state.instances.delete(taskId);

    // Update counters
    await this.updateListCounters();

    return {
      success: true,
      output: {
        success: true,
        deletedAt: now
      },
      stateChanges: new Map()
    };
  }

  private async updateListCounters(): Promise<void> {
    const listInstance = this.state.instances.get(this.rootInstanceId);
    if (!listInstance) return;

    const taskOrder = listInstance.state.taskOrder as string[];
    let completed = 0;
    let active = 0;
    let pending = 0;

    for (const taskId of taskOrder) {
      const task = this.state.instances.get(taskId);
      if (!task) continue;

      const status = task.state.status as string;
      if (status === 'completed') completed++;
      else if (status === 'in_progress') active++;
      else if (status === 'pending') pending++;
    }

    listInstance.state.completedTasks = completed;
    listInstance.state.activeTasks = active;
    listInstance.state.pendingTasks = pending;
  }

  getState(): ToolState {
    return this.state;
  }

  getInstance(instanceId: string): ObjectInstance | undefined {
    return this.state.instances.get(instanceId);
  }

  getInstancesByType(typeName: string): ObjectInstance[] {
    return Array.from(this.state.instances.values()).filter(inst => inst.typeName === typeName);
  }

  exportPublicStates(): Record<string, Record<string, unknown>> {
    const result: Record<string, Record<string, unknown>> = {};

    for (const [instanceId, instance] of this.state.instances) {
      const objectType = this.definition.objectTypes.find(t => t.typeName === instance.typeName);
      if (!objectType) continue;

      const publicState: Record<string, unknown> = {};
      for (const stateVar of objectType.states) {
        if (stateVar.isPublic) {
          publicState[stateVar.name] = instance.state[stateVar.name];
        }
      }

      result[instanceId] = publicState;
    }

    return result;
  }

  async createInstance(
    typeName: string,
    initialState?: Record<string, unknown>
  ): Promise<ObjectInstance> {
    const objectType = this.definition.objectTypes.find(t => t.typeName === typeName);
    if (!objectType) {
      throw new Error(`Object type ${typeName} not found`);
    }

    if (objectType.isRoot) {
      throw new Error('Cannot create additional root instances');
    }

    const instanceId = `${typeName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const state: Record<string, unknown> = {};

    // Initialize state with defaults
    for (const stateVar of objectType.states) {
      state[stateVar.name] = initialState?.[stateVar.name] ?? stateVar.initialValue;
    }

    const instance: ObjectInstance = {
      instanceId,
      typeName,
      state,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.state.instances.set(instanceId, instance);
    return instance;
  }

  async destroyInstance(instanceId: string): Promise<boolean> {
    const instance = this.state.instances.get(instanceId);
    if (!instance) {
      return false;
    }

    if (instance.typeName === 'TodoList') {
      throw new Error('Cannot destroy root instance');
    }

    // Remove from task order if it's a task
    if (instance.typeName === 'TodoTask') {
      const listInstance = this.state.instances.get(this.rootInstanceId);
      if (listInstance) {
        const taskOrder = listInstance.state.taskOrder as string[];
        listInstance.state.taskOrder = taskOrder.filter(id => id !== instanceId);
      }
    }

    return this.state.instances.delete(instanceId);
  }

  async reset(): Promise<void> {
    // Clear all instances except root
    const rootInstance = this.state.instances.get(this.rootInstanceId);
    this.state.instances.clear();

    if (rootInstance) {
      // Reset root to initial state
      const listType = this.definition.getRootType();
      for (const stateVar of listType.states) {
        rootInstance.state[stateVar.name] = stateVar.initialValue;
      }
      rootInstance.updatedAt = new Date();
      this.state.instances.set(this.rootInstanceId, rootInstance);
    }

    this.state.timestamp = new Date();
  }
}
