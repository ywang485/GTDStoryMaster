/**
 * Example Tool Implementation: Pomodoro Timer
 *
 * This demonstrates how to implement a tool using the tool interface.
 * The Pomodoro tool manages:
 * - A root "Timer" object (singleton) managing global settings
 * - Multiple "Session" objects representing individual pomodoro sessions
 *
 * Exogenous Actions (externally triggerable):
 * - Timer.start(): Start a new pomodoro session
 * - Timer.pause(): Pause the current session
 * - Timer.resume(): Resume a paused session
 * - Timer.complete(): Mark current session as complete
 * - Timer.configure(): Change timer settings
 *
 * Public States (for visualization):
 * - Timer: currentSessionId, totalSessions, settings
 * - Session: status, remainingSeconds, type, completedAt
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

const TimerSettingsSchema = z.object({
  workDurationMinutes: z.number().min(1).max(120),
  shortBreakMinutes: z.number().min(1).max(30),
  longBreakMinutes: z.number().min(1).max(60),
  sessionsUntilLongBreak: z.number().min(1).max(10)
});

const SessionTypeSchema = z.enum(['work', 'short_break', 'long_break']);

const SessionStatusSchema = z.enum(['active', 'paused', 'completed', 'cancelled']);

const ToolInputSchema = z.object({
  initialSettings: TimerSettingsSchema.optional(),
  taskContext: z.record(z.unknown()).optional()
});

const ToolOutputSchema = z.object({
  totalWorkTime: z.number().describe('Total work time in seconds'),
  completedSessions: z.number().describe('Number of completed sessions'),
  currentStreak: z.number().describe('Current streak of completed sessions'),
  productivity: z.number().describe('Productivity score (0-100)')
});

// ============================================================================
// State Variables
// ============================================================================

const timerStateVariables: StateVariable[] = [
  {
    name: 'currentSessionId',
    description: 'ID of the currently active session (null if no active session)',
    schema: z.string().nullable(),
    isPublic: true,
    initialValue: null
  },
  {
    name: 'settings',
    description: 'Timer configuration settings',
    schema: TimerSettingsSchema,
    isPublic: true,
    initialValue: {
      workDurationMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      sessionsUntilLongBreak: 4
    }
  },
  {
    name: 'totalSessions',
    description: 'Total number of completed sessions',
    schema: z.number(),
    isPublic: true,
    initialValue: 0
  },
  {
    name: 'currentStreak',
    description: 'Current streak of completed work sessions',
    schema: z.number(),
    isPublic: true,
    initialValue: 0
  },
  {
    name: 'lastSessionEndTime',
    description: 'Timestamp of last session end (internal)',
    schema: z.date().nullable(),
    isPublic: false,
    initialValue: null,
    isReadOnly: true
  }
];

const sessionStateVariables: StateVariable[] = [
  {
    name: 'status',
    description: 'Current status of the session',
    schema: SessionStatusSchema,
    isPublic: true,
    initialValue: 'active'
  },
  {
    name: 'type',
    description: 'Type of session (work, short break, or long break)',
    schema: SessionTypeSchema,
    isPublic: true,
    initialValue: 'work'
  },
  {
    name: 'durationSeconds',
    description: 'Total duration of this session in seconds',
    schema: z.number(),
    isPublic: true,
    initialValue: 1500 // 25 minutes
  },
  {
    name: 'elapsedSeconds',
    description: 'Elapsed time in seconds',
    schema: z.number(),
    isPublic: true,
    initialValue: 0
  },
  {
    name: 'remainingSeconds',
    description: 'Remaining time in seconds',
    schema: z.number(),
    isPublic: true,
    initialValue: 1500
  },
  {
    name: 'startedAt',
    description: 'Session start timestamp',
    schema: z.date(),
    isPublic: true,
    initialValue: new Date()
  },
  {
    name: 'pausedAt',
    description: 'Session pause timestamp (null if not paused)',
    schema: z.date().nullable(),
    isPublic: false,
    initialValue: null
  },
  {
    name: 'completedAt',
    description: 'Session completion timestamp (null if not completed)',
    schema: z.date().nullable(),
    isPublic: true,
    initialValue: null
  },
  {
    name: 'associatedTaskId',
    description: 'ID of associated GTD task (if any)',
    schema: z.string().nullable(),
    isPublic: true,
    initialValue: null
  }
];

// ============================================================================
// Action Parameters
// ============================================================================

const startSessionParams: ActionParameter[] = [
  {
    name: 'type',
    description: 'Type of session to start',
    schema: SessionTypeSchema,
    required: false,
    defaultValue: 'work'
  },
  {
    name: 'taskId',
    description: 'Associated task ID',
    schema: z.string(),
    required: false
  }
];

const configureParams: ActionParameter[] = [
  {
    name: 'settings',
    description: 'New timer settings',
    schema: TimerSettingsSchema.partial(),
    required: true
  }
];

// ============================================================================
// Actions
// ============================================================================

const timerActions: ActionDefinition[] = [
  {
    name: 'start',
    description: 'Start a new pomodoro session',
    parameters: startSessionParams,
    isExogenous: true,
    affectedStates: ['currentSessionId'],
    returnSchema: z.object({
      sessionId: z.string(),
      type: SessionTypeSchema,
      durationSeconds: z.number()
    })
  },
  {
    name: 'pause',
    description: 'Pause the current active session',
    parameters: [],
    isExogenous: true,
    affectedStates: ['currentSessionId'],
    returnSchema: z.object({
      success: z.boolean(),
      pausedAt: z.date()
    })
  },
  {
    name: 'resume',
    description: 'Resume a paused session',
    parameters: [],
    isExogenous: true,
    affectedStates: ['currentSessionId'],
    returnSchema: z.object({
      success: z.boolean(),
      resumedAt: z.date()
    })
  },
  {
    name: 'complete',
    description: 'Mark current session as complete',
    parameters: [],
    isExogenous: true,
    affectedStates: ['currentSessionId', 'totalSessions', 'currentStreak', 'lastSessionEndTime'],
    returnSchema: z.object({
      success: z.boolean(),
      completedAt: z.date(),
      newStreak: z.number()
    })
  },
  {
    name: 'configure',
    description: 'Update timer settings',
    parameters: configureParams,
    isExogenous: true,
    affectedStates: ['settings'],
    returnSchema: z.object({
      success: z.boolean(),
      newSettings: TimerSettingsSchema
    })
  },
  {
    name: 'tick',
    description: 'Internal tick to update session time (called by executor)',
    parameters: [],
    isExogenous: false,
    affectedStates: ['currentSessionId']
  }
];

const sessionActions: ActionDefinition[] = [
  {
    name: 'updateProgress',
    description: 'Update session elapsed/remaining time (internal)',
    parameters: [
      {
        name: 'elapsedSeconds',
        description: 'New elapsed time',
        schema: z.number(),
        required: true
      }
    ],
    isExogenous: false,
    affectedStates: ['elapsedSeconds', 'remainingSeconds']
  },
  {
    name: 'setStatus',
    description: 'Change session status (internal)',
    parameters: [
      {
        name: 'status',
        description: 'New status',
        schema: SessionStatusSchema,
        required: true
      }
    ],
    isExogenous: false,
    affectedStates: ['status', 'pausedAt', 'completedAt']
  }
];

// ============================================================================
// Object Type Definitions
// ============================================================================

const timerObjectType: ObjectTypeDefinition = {
  typeName: 'Timer',
  description: 'Singleton root object managing the pomodoro timer',
  isRoot: true,
  states: timerStateVariables,
  actions: timerActions,
  maxInstances: 1
};

const sessionObjectType: ObjectTypeDefinition = {
  typeName: 'Session',
  description: 'Individual pomodoro session instance',
  isRoot: false,
  states: sessionStateVariables,
  actions: sessionActions
  // No maxInstances = unlimited
};

// ============================================================================
// Tool Definition
// ============================================================================

const pomodoroMetadata: ToolMetadata = {
  name: 'pomodoro-timer',
  version: '1.0.0',
  description: 'Pomodoro technique timer for productivity tracking',
  usageDescription: `The Pomodoro Timer tool helps track work sessions using the Pomodoro technique.

**Input**: Accepts initial timer settings and task context
**Output**: Returns productivity metrics including total work time, completed sessions, and productivity score

**How to use**:
1. Start a work session with Timer.start()
2. Work until the timer completes (25 minutes by default)
3. Complete the session with Timer.complete()
4. Take a break (short or long depending on streak)
5. Repeat for maximum productivity

The tool automatically tracks streaks and suggests break types based on the number of completed sessions.`,
  author: 'GTD Story Master',
  tags: ['productivity', 'time-management', 'pomodoro']
};

const pomodoroIO: ToolIOSpecification = {
  inputSchema: ToolInputSchema,
  outputSchema: ToolOutputSchema,
  inputDescription: 'Optional initial settings and task context for the timer',
  outputDescription: 'Productivity metrics including work time, sessions, streak, and score',
  exampleInput: {
    initialSettings: {
      workDurationMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      sessionsUntilLongBreak: 4
    },
    taskContext: {
      currentTaskId: 'task-123'
    }
  },
  exampleOutput: {
    totalWorkTime: 3600,
    completedSessions: 4,
    currentStreak: 4,
    productivity: 87.5
  }
};

export const pomodoroToolDefinition: ToolDefinition = createToolDefinition(
  pomodoroMetadata,
  pomodoroIO,
  [timerObjectType, sessionObjectType]
);

// ============================================================================
// Tool Executor Implementation
// ============================================================================

export class PomodoroToolExecutor implements ToolExecutor {
  definition: ToolDefinition;
  private state: ToolState;
  private rootInstanceId = 'timer-root';

  constructor() {
    this.definition = pomodoroToolDefinition;
    this.state = {
      toolName: pomodoroMetadata.name,
      timestamp: new Date(),
      instances: new Map()
    };
  }

  async initialize(input: unknown): Promise<ToolState> {
    const parsed = ToolInputSchema.parse(input);

    // Create root timer instance
    const rootInstance: ObjectInstance = {
      instanceId: this.rootInstanceId,
      typeName: 'Timer',
      state: {
        currentSessionId: null,
        settings: parsed.initialSettings ?? timerStateVariables[1].initialValue,
        totalSessions: 0,
        currentStreak: 0,
        lastSessionEndTime: null
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: parsed.taskContext
    };

    this.state.instances.set(this.rootInstanceId, rootInstance);
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

    // Route to appropriate action handler
    switch (context.actionName) {
      case 'start':
        return this.handleStart(instance, context);
      case 'pause':
        return this.handlePause(instance, context);
      case 'resume':
        return this.handleResume(instance, context);
      case 'complete':
        return this.handleComplete(instance, context);
      case 'configure':
        return this.handleConfigure(instance, context);
      default:
        return {
          success: false,
          error: `Unknown action: ${context.actionName}`,
          stateChanges: new Map()
        };
    }
  }

  private async handleStart(
    timerInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const params = context.parameters as { type?: string; taskId?: string };
    const sessionType = (params.type ?? 'work') as 'work' | 'short_break' | 'long_break';

    // Determine duration based on type and settings
    const settings = timerInstance.state.settings as z.infer<typeof TimerSettingsSchema>;
    let durationMinutes: number;
    switch (sessionType) {
      case 'work':
        durationMinutes = settings.workDurationMinutes;
        break;
      case 'short_break':
        durationMinutes = settings.shortBreakMinutes;
        break;
      case 'long_break':
        durationMinutes = settings.longBreakMinutes;
        break;
    }

    // Create new session
    const sessionId = `session-${Date.now()}`;
    const durationSeconds = durationMinutes * 60;
    const sessionInstance: ObjectInstance = {
      instanceId: sessionId,
      typeName: 'Session',
      state: {
        status: 'active',
        type: sessionType,
        durationSeconds,
        elapsedSeconds: 0,
        remainingSeconds: durationSeconds,
        startedAt: new Date(),
        pausedAt: null,
        completedAt: null,
        associatedTaskId: params.taskId ?? null
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.state.instances.set(sessionId, sessionInstance);

    // Update timer state
    const stateChanges = new Map<string, unknown>();
    stateChanges.set('currentSessionId', sessionId);
    timerInstance.state.currentSessionId = sessionId;
    timerInstance.updatedAt = new Date();

    return {
      success: true,
      output: {
        sessionId,
        type: sessionType,
        durationSeconds
      },
      stateChanges
    };
  }

  private async handlePause(
    timerInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const currentSessionId = timerInstance.state.currentSessionId as string | null;
    if (!currentSessionId) {
      return {
        success: false,
        error: 'No active session to pause',
        stateChanges: new Map()
      };
    }

    const session = this.state.instances.get(currentSessionId);
    if (!session) {
      return {
        success: false,
        error: 'Current session not found',
        stateChanges: new Map()
      };
    }

    const now = new Date();
    session.state.status = 'paused';
    session.state.pausedAt = now;
    session.updatedAt = now;

    const stateChanges = new Map<string, unknown>();
    stateChanges.set('status', 'paused');
    stateChanges.set('pausedAt', now);

    return {
      success: true,
      output: { success: true, pausedAt: now },
      stateChanges
    };
  }

  private async handleResume(
    timerInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const currentSessionId = timerInstance.state.currentSessionId as string | null;
    if (!currentSessionId) {
      return {
        success: false,
        error: 'No session to resume',
        stateChanges: new Map()
      };
    }

    const session = this.state.instances.get(currentSessionId);
    if (!session || session.state.status !== 'paused') {
      return {
        success: false,
        error: 'Session is not paused',
        stateChanges: new Map()
      };
    }

    const now = new Date();
    session.state.status = 'active';
    session.state.pausedAt = null;
    session.updatedAt = now;

    const stateChanges = new Map<string, unknown>();
    stateChanges.set('status', 'active');
    stateChanges.set('pausedAt', null);

    return {
      success: true,
      output: { success: true, resumedAt: now },
      stateChanges
    };
  }

  private async handleComplete(
    timerInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const currentSessionId = timerInstance.state.currentSessionId as string | null;
    if (!currentSessionId) {
      return {
        success: false,
        error: 'No active session to complete',
        stateChanges: new Map()
      };
    }

    const session = this.state.instances.get(currentSessionId);
    if (!session) {
      return {
        success: false,
        error: 'Current session not found',
        stateChanges: new Map()
      };
    }

    const now = new Date();
    session.state.status = 'completed';
    session.state.completedAt = now;
    session.updatedAt = now;

    // Update timer statistics
    const stateChanges = new Map<string, unknown>();
    const isWorkSession = session.state.type === 'work';

    if (isWorkSession) {
      const newTotal = (timerInstance.state.totalSessions as number) + 1;
      const newStreak = (timerInstance.state.currentStreak as number) + 1;

      timerInstance.state.totalSessions = newTotal;
      timerInstance.state.currentStreak = newStreak;
      timerInstance.state.lastSessionEndTime = now;

      stateChanges.set('totalSessions', newTotal);
      stateChanges.set('currentStreak', newStreak);
      stateChanges.set('lastSessionEndTime', now);
    }

    timerInstance.state.currentSessionId = null;
    stateChanges.set('currentSessionId', null);
    timerInstance.updatedAt = now;

    return {
      success: true,
      output: {
        success: true,
        completedAt: now,
        newStreak: timerInstance.state.currentStreak as number
      },
      stateChanges
    };
  }

  private async handleConfigure(
    timerInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const params = context.parameters as { settings: Partial<z.infer<typeof TimerSettingsSchema>> };

    const currentSettings = timerInstance.state.settings as z.infer<typeof TimerSettingsSchema>;
    const newSettings = { ...currentSettings, ...params.settings };

    // Validate new settings
    const result = TimerSettingsSchema.safeParse(newSettings);
    if (!result.success) {
      return {
        success: false,
        error: `Invalid settings: ${result.error.message}`,
        stateChanges: new Map()
      };
    }

    timerInstance.state.settings = result.data;
    timerInstance.updatedAt = new Date();

    const stateChanges = new Map<string, unknown>();
    stateChanges.set('settings', result.data);

    return {
      success: true,
      output: {
        success: true,
        newSettings: result.data
      },
      stateChanges
    };
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

    // Check max instances
    if (objectType.maxInstances !== undefined) {
      const existing = this.getInstancesByType(typeName);
      if (existing.length >= objectType.maxInstances) {
        throw new Error(`Maximum instances (${objectType.maxInstances}) reached for ${typeName}`);
      }
    }

    const instanceId = `${typeName.toLowerCase()}-${Date.now()}`;
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

    if (instance.typeName === 'Timer') {
      throw new Error('Cannot destroy root instance');
    }

    return this.state.instances.delete(instanceId);
  }

  async reset(): Promise<void> {
    // Keep only root instance
    const rootInstance = this.state.instances.get(this.rootInstanceId);
    this.state.instances.clear();

    if (rootInstance) {
      // Reset root state to initial values
      const timerType = this.definition.getRootType();
      for (const stateVar of timerType.states) {
        rootInstance.state[stateVar.name] = stateVar.initialValue;
      }
      rootInstance.updatedAt = new Date();
      this.state.instances.set(this.rootInstanceId, rootInstance);
    }

    this.state.timestamp = new Date();
  }
}
