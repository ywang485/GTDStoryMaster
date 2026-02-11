# Tool Interface for GTD Story Master

## Overview

This module provides a comprehensive interface for defining and integrating **tools** with the GTD Story Master. A tool is an object-oriented state machine that can:

- Maintain state across multiple object instances
- Expose actions that can be triggered externally (by the story master or LLM)
- Provide public state for visualization
- Integrate seamlessly with the narrative flow

## Core Concepts

### What is a Tool?

A **tool** is defined by:

1. **Object Types**: Different classes of objects (e.g., Timer, Session)
2. **State Variables**: For each object type, variables that hold state
3. **Actions**: For each object type, operations that can modify state (possibly with parameters)
4. **Internal Logic**: How actions change state (implemented by the tool executor)
5. **Root Object**: A singleton object managing global state and object creation

### Key Features

- **Object-Oriented**: Tools consist of typed objects with their own state and actions
- **State Machine**: Each object transitions between states based on actions
- **External Visibility**: Clear separation between:
  - **Exogenous Actions**: Actions triggerable externally (e.g., by LLM or UI)
  - **Public States**: State variables exposed for visualization
  - **Internal Actions/States**: Implementation details hidden from external view
- **Type-Safe**: Full TypeScript support with Zod schema validation
- **MCP-Compatible**: Similar structure to Model Context Protocol but with enhanced object orientation

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Tool Definition                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │ Object     │  │ Object     │  │ Object     │            │
│  │ Type 1     │  │ Type 2     │  │ Type 3     │            │
│  │            │  │            │  │ (Root)     │            │
│  │ • States   │  │ • States   │  │ • States   │            │
│  │ • Actions  │  │ • Actions  │  │ • Actions  │            │
│  └────────────┘  └────────────┘  └────────────┘            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Tool Executor                          │
│                                                              │
│  ┌──────────────────────────────────────────────────┐      │
│  │            Tool State (Runtime)                  │      │
│  │                                                   │      │
│  │  Instance 1 ────► State { ... }                 │      │
│  │  Instance 2 ────► State { ... }                 │      │
│  │  Instance 3 ────► State { ... }                 │      │
│  └──────────────────────────────────────────────────┘      │
│                                                              │
│  • Execute Actions                                          │
│  • Manage State Transitions                                 │
│  • Create/Destroy Instances                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Tool Registry                           │
│                                                              │
│  • Register/Unregister Tools                                │
│  • Tool Discovery                                           │
│  • LLM Context Generation                                   │
└─────────────────────────────────────────────────────────────┘
```

## Usage Guide

### 1. Define Object Types

Each object type specifies its state variables and actions:

```typescript
import { ObjectTypeDefinition, StateVariable, ActionDefinition } from './tool-interface';
import { z } from 'zod';

const timerStates: StateVariable[] = [
  {
    name: 'currentSessionId',
    description: 'ID of the active session',
    schema: z.string().nullable(),
    isPublic: true,  // Exposed for visualization
    initialValue: null
  },
  {
    name: 'settings',
    description: 'Timer configuration',
    schema: z.object({
      workDurationMinutes: z.number(),
      breakDurationMinutes: z.number()
    }),
    isPublic: true,
    initialValue: { workDurationMinutes: 25, breakDurationMinutes: 5 }
  }
];

const timerActions: ActionDefinition[] = [
  {
    name: 'start',
    description: 'Start a new timer session',
    parameters: [
      {
        name: 'taskId',
        description: 'Associated task ID',
        schema: z.string(),
        required: false
      }
    ],
    isExogenous: true,  // Can be triggered externally
    affectedStates: ['currentSessionId'],
    returnSchema: z.object({
      sessionId: z.string(),
      startTime: z.date()
    })
  }
];

const timerObjectType: ObjectTypeDefinition = {
  typeName: 'Timer',
  description: 'Root timer object',
  isRoot: true,  // Singleton root object
  states: timerStates,
  actions: timerActions,
  maxInstances: 1
};
```

### 2. Create Tool Definition

Assemble your object types into a complete tool definition:

```typescript
import { createToolDefinition, ToolMetadata, ToolIOSpecification } from './tool-interface';

const metadata: ToolMetadata = {
  name: 'pomodoro-timer',
  version: '1.0.0',
  description: 'Pomodoro technique timer',
  usageDescription: 'Use this tool to track work sessions...',
  tags: ['productivity', 'time-management']
};

const io: ToolIOSpecification = {
  inputSchema: z.object({
    initialSettings: z.object({...}).optional()
  }),
  outputSchema: z.object({
    totalWorkTime: z.number(),
    completedSessions: z.number()
  }),
  inputDescription: 'Optional initial settings',
  outputDescription: 'Productivity metrics'
};

const toolDefinition = createToolDefinition(
  metadata,
  io,
  [timerObjectType, sessionObjectType]  // All object types
);
```

### 3. Implement Tool Executor

The executor handles the actual state management and action execution:

```typescript
import { ToolExecutor, ActionContext, ActionResult, ToolState } from './tool-interface';

class MyToolExecutor implements ToolExecutor {
  definition = myToolDefinition;
  private state: ToolState;

  async initialize(input: unknown): Promise<ToolState> {
    // Create root instance with initial state
    // Return initial tool state
  }

  async executeAction(context: ActionContext): Promise<ActionResult> {
    // Route to appropriate action handler
    // Update state
    // Return result with state changes
  }

  getState(): ToolState {
    return this.state;
  }

  // ... implement other methods
}
```

### 4. Register the Tool

Register your tool with the global registry:

```typescript
import { registerGlobalTool } from './tool-registry';

const executor = new MyToolExecutor();
registerGlobalTool(toolDefinition, executor);
```

### 5. Use the Tool

```typescript
import { getGlobalTool } from './tool-registry';

// Get the tool
const tool = getGlobalTool('pomodoro-timer');

// Initialize
await tool.initialize({ initialSettings: { workDurationMinutes: 25 } });

// Execute an action
const result = await tool.executeAction({
  instanceId: 'timer-root',
  actionName: 'start',
  parameters: { taskId: 'task-123' },
  timestamp: new Date()
});

// Get public states for visualization
const publicStates = tool.exportPublicStates();
```

### 6. LLM Integration

Get tool descriptions for LLM prompts:

```typescript
import { getGlobalToolDescriptionsForPrompt } from './tool-registry';

// Get formatted markdown for system prompt
const toolDescriptions = getGlobalToolDescriptionsForPrompt();

// Include in your LLM prompt
const systemPrompt = `
You are a GTD Story Master with access to the following tools:

${toolDescriptions}

When the player's actions relate to productivity, you can trigger tool actions...
`;
```

## Complete Example

See `/src/lib/tools/examples/pomodoro-tool.ts` for a complete, production-ready example that demonstrates:

- Multiple object types (Timer and Session)
- Public and private states
- Exogenous and internal actions
- Full state machine logic
- Validation and error handling

## Key Interfaces

### ToolDefinition

The complete specification of a tool, including:
- `metadata`: Tool name, version, description
- `io`: Input/output schemas
- `objectTypes`: All object type definitions
- `getRootType()`: Returns the singleton root object type
- `getExogenousActions()`: Returns externally-triggerable actions
- `getPublicStates()`: Returns visualization-ready states

### ObjectTypeDefinition

Defines a type of object within a tool:
- `typeName`: Unique type identifier
- `isRoot`: Whether this is the singleton root
- `states`: State variables with schemas and visibility
- `actions`: Available actions with parameters and return types
- `maxInstances`: Optional limit on instance count

### StateVariable

Defines a state variable:
- `name`: Variable name
- `schema`: Zod schema for validation
- `isPublic`: Whether exposed for external visualization
- `initialValue`: Default value
- `isReadOnly`: Optional read-only flag

### ActionDefinition

Defines an action:
- `name`: Action name
- `description`: Human-readable description for LLM
- `parameters`: Typed parameters with schemas
- `isExogenous`: Whether externally triggerable
- `affectedStates`: Which states this action modifies
- `returnSchema`: Optional return type schema

### ToolExecutor

Runtime interface for executing tools:
- `initialize(input)`: Set up initial state
- `executeAction(context)`: Execute an action
- `getState()`: Get current state snapshot
- `exportPublicStates()`: Get visualization-ready state
- `createInstance(type)`: Create new object instance
- `destroyInstance(id)`: Remove an instance

### ToolRegistry

Manages multiple tools:
- `registerTool(def, executor)`: Register a tool
- `getTool(name)`: Get tool by name
- `getToolsForLLM()`: Get tools formatted for LLM context
- `getToolDescriptionsForPrompt()`: Get markdown for prompts

## Design Principles

### 1. Separation of Concerns

- **Definition** (interface) is separate from **Execution** (implementation)
- **Public** (external visibility) is separate from **Private** (internal logic)
- **Structure** (types) is separate from **Data** (instances)

### 2. Type Safety

- All schemas use Zod for runtime validation
- TypeScript provides compile-time type checking
- Action parameters and return types are strongly typed

### 3. Composability

- Tools are independent and can be composed
- Object instances can reference each other via IDs
- Root object coordinates instance creation

### 4. Testability

- Pure functions for state transitions
- Deterministic action execution
- Easy to mock and test in isolation

### 5. LLM-First Design

- Rich descriptions for all actions and states
- Clear input/output specifications
- Usage examples included in metadata

## Advanced Features

### State Machine Validation

```typescript
import { ToolValidator } from './tool-interface';

const validation = ToolValidator.validateDefinition(toolDef);
if (!validation.valid) {
  console.error('Tool validation errors:', validation.errors);
}
```

### Action Context Validation

```typescript
const contextValidation = ToolValidator.validateActionContext(
  toolDef,
  actionContext
);
```

### Tool Statistics

```typescript
import { getGlobalToolRegistry } from './tool-registry';

const registry = getGlobalToolRegistry();
const stats = registry.getStatistics();
console.log(`Total tools: ${stats.totalTools}`);
console.log(`Total exogenous actions: ${stats.totalExogenousActions}`);
```

### State Export/Import

```typescript
// Export all tool states
const allStates = registry.exportAllStates();

// Could be persisted, transmitted, or visualized
localStorage.setItem('tool-states', JSON.stringify(allStates));
```

## Integration with GTD Story Master

### Narrative Integration

Tools can be integrated into the narrative flow:

1. **Context Building**: Tool states included in `TurnContext`
2. **Action Execution**: Player actions trigger tool actions
3. **State Updates**: Tool results update game state
4. **Visualization**: Public states rendered in UI

### Example Integration Points

```typescript
// In /src/lib/engine/context-builder.ts
import { getGlobalToolRegistry } from '@/lib/tools';

export function buildTurnContext(gameState: GameSession): TurnContext {
  const registry = getGlobalToolRegistry();

  return {
    // ... existing context
    toolStates: registry.exportAllStates(),
    availableToolActions: registry.getToolsForLLM()
  };
}
```

```typescript
// In /src/lib/ai/prompts/narrate.ts
import { getGlobalToolDescriptionsForPrompt } from '@/lib/tools';

export function buildNarratePrompt(context: TurnContext): PromptMessages {
  const toolsSection = getGlobalToolDescriptionsForPrompt();

  return {
    system: `
      You are the GTD Story Master...

      ${toolsSection}

      When appropriate, trigger tool actions to enhance the experience.
    `,
    // ... rest of prompt
  };
}
```

## Future Extensions

Possible future enhancements:

1. **Tool Composition**: Tools that depend on other tools
2. **Event System**: Tools emit events that others can subscribe to
3. **Persistence**: Automatic state persistence and restoration
4. **Visualization Framework**: Standard components for rendering public states
5. **Tool Marketplace**: Registry of community-contributed tools
6. **Hot Reloading**: Update tools without restarting
7. **Tool Analytics**: Track usage and performance metrics
8. **Inter-Tool Communication**: Message passing between tools

## Best Practices

1. **Keep Root Object Lightweight**: Use it primarily for coordination and instance management
2. **Design Public States for Visualization**: Think about how they'll be displayed
3. **Make Exogenous Actions Atomic**: Each action should be a clear, single operation
4. **Validate Inputs**: Use Zod schemas to validate all action parameters
5. **Handle Errors Gracefully**: Return meaningful error messages in ActionResult
6. **Document Thoroughly**: LLMs rely on clear descriptions
7. **Test State Transitions**: Unit test all action handlers
8. **Version Your Tools**: Use semantic versioning for compatibility

## API Reference

See TypeScript type definitions in:
- `/src/lib/tools/tool-interface.ts` - Core interfaces
- `/src/lib/tools/tool-registry.ts` - Registry implementation
- `/src/lib/tools/examples/pomodoro-tool.ts` - Complete example

## Contributing

When adding new tools:

1. Follow the structure demonstrated in the Pomodoro example
2. Validate your tool definition using `ToolValidator`
3. Provide comprehensive tests
4. Document all public states and exogenous actions
5. Include usage examples
6. Consider visualization requirements

## License

Same as GTD Story Master project.
