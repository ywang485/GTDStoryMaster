# Todo List Tool Integration Guide

This guide explains how the TodoList tool has been integrated with GTD Story Master and how to complete the migration from the old task management system.

## ✅ What's Been Implemented (Phase 1)

### 1. Tool Store (`src/stores/use-tool-store.ts`)
A dedicated Zustand store for managing tool instances:
- `initializeTodoList()` - Initialize the todo list with tasks
- `createTask()` - Create new tasks
- `updateTaskStatus()` - Change task status (pending/in_progress/completed/blocked/cancelled)
- `updateTaskDetails()` - Modify task properties
- `deleteTask()` - Remove tasks
- `reorderTasks()` - Change task order
- `clearCompleted()` - Archive/delete completed tasks
- `getStats()` - Get comprehensive statistics
- `configureTodoList()` - Update tool configuration
- `getPublicStates()` - Export visualization-ready state

### 2. Migration Utilities (`src/lib/tools/migration.ts`)
Functions to convert between old `Task` format and new `TodoTask` format:
- `migrateTaskStatus()` - Convert status (`active` → `in_progress`, `skipped` → `cancelled`)
- `convertTaskToTodoTaskParams()` - Convert Task to creation parameters (maps aversiveness/cognitiveLoad to tags)
- `convertTodoTaskToTask()` - Convert back to old Task format (for compatibility)
- `migrateTasksToTodoList()` - Bulk migration
- `extractTasksFromToolState()` - Get all tasks from tool
- `getOrderedTasksFromTool()` - Get tasks in order

### 3. Type Updates (`src/types/game.ts`)
- Added `toolStates` to `TurnContext` for passing tool state to AI

### 4. Context Builder Updates (`src/lib/engine/context-builder.ts`)
- `buildTurnContext()` now accepts and includes `toolStates`

## 🔄 How to Complete the Integration (Phase 2)

### Step 1: Initialize Tool on Game Start

In your setup flow, initialize the todo list tool with the player's tasks:

```typescript
// In setup/page.tsx or wherever tasks are first created
import { useToolStore } from '@/stores/use-tool-store';
import { migrateTasksToTodoList } from '@/lib/tools';

const toolStore = useToolStore();

// After getting tasks from the user
const migratedTasks = migrateTasksToTodoList(rawTasks);
await toolStore.initializeTodoList(migratedTasks);
```

### Step 2: Update Game Store to Use Tool Store

Modify `src/stores/use-game-store.ts` to delegate task operations to the tool:

```typescript
import { useToolStore } from './use-tool-store';

// In the store actions:
completeTask: async (taskId) => {
  // Update tool
  const toolStore = useToolStore.getState();
  await toolStore.updateTaskStatus(taskId, 'completed');

  // Update game state (for backwards compatibility)
  set((state) => ({
    completedTaskIds: [...new Set([...state.completedTaskIds, taskId])],
    // tasks is now derived from tool
  }));
},

reorderTasks: async (taskIds) => {
  const toolStore = useToolStore.getState();
  await toolStore.reorderTasks(taskIds);
},
```

### Step 3: Derive Tasks from Tool State

Add a computed property to get tasks from the tool:

```typescript
// In use-game-store.ts
import { getOrderedTasksFromTool } from '@/lib/tools';

// Add a getter
getTasks: () => {
  const toolStore = useToolStore.getState();
  if (!toolStore.todoListState) {
    return get().tasks; // Fallback to old system
  }
  return getOrderedTasksFromTool(toolStore.todoListState.instances);
},
```

### Step 4: Update API Endpoints

#### In `/api/ai/narrate/route.ts`:

```typescript
import { useToolStore } from '@/stores/use-tool-store';
import { getOrderedTasksFromTool } from '@/lib/tools';

// When building context
const toolStore = useToolStore.getState();
const toolStates = toolStore.getPublicStates();
const tasks = toolStore.todoListState
  ? getOrderedTasksFromTool(toolStore.todoListState.instances)
  : gameState.tasks;

const context = buildTurnContext({
  // ... other params
  tasks,
  toolStates: { todoList: toolStates }
});
```

#### Process Task Updates from AI Response:

```typescript
// After getting AI response with task updates
if (response.updatedTaskCompletionState) {
  const toolStore = useToolStore.getState();

  for (const update of response.updatedTaskCompletionState) {
    const newStatus = update.status === 'completed' ? 'completed'
      : update.status === 'active' ? 'in_progress'
      : 'pending';

    await toolStore.updateTaskStatus(update.taskId, newStatus);
  }
}

if (response.adjustedTaskOrder) {
  await toolStore.reorderTasks(response.adjustedTaskOrder);
}
```

### Step 5: Update UI Components

Modify components to read from tool state:

```typescript
// In game/QuestProgress.tsx or similar
import { useToolStore } from '@/stores/use-tool-store';
import { getOrderedTasksFromTool } from '@/lib/tools';

function TaskList() {
  const todoListState = useToolStore(state => state.todoListState);
  const updateStatus = useToolStore(state => state.updateTaskStatus);

  const tasks = todoListState
    ? getOrderedTasksFromTool(todoListState.instances)
    : [];

  return (
    <div>
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          onComplete={() => updateStatus(task.id, 'completed')}
        />
      ))}
    </div>
  );
}
```

### Step 6: Update Prompts to Include Tool Information

Enhance AI prompts to reference the tool:

```typescript
// In src/lib/ai/prompts/narrate.ts
import { getGlobalToolDescriptionsForPrompt } from '@/lib/tools';

const systemPrompt = `
You are the GTD Story Master...

${context.toolStates ? getGlobalToolDescriptionsForPrompt() : ''}

When narrating, you can reference task details from the todoList tool states.
Current tool state provides:
${context.toolStates?.todoList ? JSON.stringify(context.toolStates.todoList, null, 2) : 'No tool state'}

...
`;
```

## 📊 Using Tool Features

### Get Statistics

```typescript
const toolStore = useToolStore.getState();
const statsResult = await toolStore.getStats();

console.log(statsResult.output);
// {
//   byStatus: { completed: 5, in_progress: 2, pending: 3 },
//   byPriority: { high: 3, medium: 5, low: 2 },
//   totalEstimatedTime: 180,
//   totalActualTime: 150,
//   overdueTasks: 1,
//   blockedTasks: 0
// }
```

### Work with Dependencies

```typescript
// Create a task with dependencies
await toolStore.createTask({
  title: "Deploy application",
  dependencies: ["task-id-1", "task-id-2"], // Must complete these first
  priority: "high"
});
```

### Configure the List

```typescript
await toolStore.configureTodoList({
  autoArchiveCompleted: true,
  maxActiveTasks: 5, // Prevent overcommitment
  defaultPriority: "medium"
});
```

### Track Time

```typescript
// Start a task
await toolStore.updateTaskStatus(taskId, 'in_progress');

// Complete with actual time
await toolStore.updateTaskStatus(taskId, 'completed', 45); // 45 minutes
```

## 🔄 Migration Path

### Option 1: Gradual Migration (Recommended)

1. Keep both systems running in parallel
2. Initialize tool with current tasks on app load
3. Gradually migrate components to read from tool
4. Once all components migrated, remove old task management code

### Option 2: Full Migration

1. Run migration script on app initialization:

```typescript
// In app initialization (e.g., _app.tsx or layout.tsx)
import { useEffect } from 'react';
import { useGameStore } from '@/stores/use-game-store';
import { useToolStore } from '@/stores/use-tool-store';
import { migrateTasksToTodoList } from '@/lib/tools';

function AppInitializer() {
  useEffect(() => {
    const gameStore = useGameStore.getState();
    const toolStore = useToolStore.getState();

    // If tool not initialized but game has tasks, migrate
    if (!toolStore.todoListState && gameStore.tasks.length > 0) {
      const migratedTasks = migrateTasksToTodoList(gameStore.tasks);
      toolStore.initializeTodoList(migratedTasks);
    }
  }, []);

  return null;
}
```

## 🎨 Visualization

The tool's public states are perfect for rich UI:

```typescript
const publicStates = toolStore.getPublicStates();

// publicStates structure:
// {
//   "todolist-root": {
//     totalTasks: 10,
//     completedTasks: 5,
//     activeTasks: 2,
//     pendingTasks: 3,
//     taskOrder: ["task-1", "task-2", ...],
//     config: { ... }
//   },
//   "task-1": {
//     title: "Task title",
//     status: "in_progress",
//     priority: "high",
//     dueDate: Date,
//     estimatedMinutes: 30,
//     actualMinutes: null,
//     tags: ["work", "urgent"],
//     createdAt: Date,
//     startedAt: Date,
//     completedAt: null
//   },
//   // ... more tasks
// }
```

## 🧪 Testing

### Test Tool Functionality

```typescript
import { TodoListToolExecutor } from '@/lib/tools';

describe('TodoListTool', () => {
  it('creates and completes tasks', async () => {
    const tool = new TodoListToolExecutor();

    await tool.initialize({
      config: { defaultPriority: 'medium' }
    });

    const createResult = await tool.executeAction({
      instanceId: 'todolist-root',
      actionName: 'createTask',
      parameters: { title: 'Test task' },
      timestamp: new Date()
    });

    expect(createResult.success).toBe(true);
    const taskId = createResult.output.taskId;

    const completeResult = await tool.executeAction({
      instanceId: taskId,
      actionName: 'updateStatus',
      parameters: { status: 'completed' },
      timestamp: new Date()
    });

    expect(completeResult.success).toBe(true);

    const publicStates = tool.exportPublicStates();
    expect(publicStates['todolist-root'].completedTasks).toBe(1);
  });
});
```

## 🔧 Advanced: Custom Tool Actions

You can extend the tool with custom actions by creating a subclass:

```typescript
class CustomTodoListExecutor extends TodoListToolExecutor {
  async executeAction(context: ActionContext): Promise<ActionResult> {
    // Add custom actions
    if (context.actionName === 'bulkUpdate') {
      // Custom logic
    }

    return super.executeAction(context);
  }
}
```

## 📝 Status Mapping

| Old Status | New Status    | Notes |
|------------|---------------|-------|
| `pending`  | `pending`     | Direct map |
| `active`   | `in_progress` | Renamed for clarity |
| `completed`| `completed`   | Direct map |
| `skipped`  | `cancelled`   | More general term |
| -          | `blocked`     | New status for dependencies |

## 🎯 Benefits of Tool-Based Task Management

1. **Separation of Concerns**: Task logic isolated in tool
2. **State Machine**: Clear task lifecycle with validation
3. **Rich Metadata**: Tags, dependencies, time tracking
4. **Statistics**: Built-in analytics
5. **Type Safety**: Full TypeScript + Zod validation
6. **Testable**: Pure state machine logic
7. **Observable**: Public states for UI reactivity
8. **Extensible**: Easy to add features without touching game logic
9. **Reusable**: Tool can be used in other contexts
10. **LLM-Friendly**: Rich descriptions for AI integration

## 🚀 Next Steps

1. Complete the integration following steps above
2. Test thoroughly with existing game flows
3. Consider adding more tools (Pomodoro, Calendar, etc.)
4. Build rich visualization components for tool states
5. Add tool action suggestions to AI narrative

## 📚 Reference

- Tool Interface: `src/lib/tools/tool-interface.ts`
- Todo List Tool: `src/lib/tools/examples/todo-list-tool.ts`
- Tool Store: `src/stores/use-tool-store.ts`
- Migration Utils: `src/lib/tools/migration.ts`
- Integration Examples: This guide
