/**
 * Example Tool Implementation: Pomodoro Timer
 *
 * The Pomodoro tool manages:
 * - A root "Timer" object (singleton) managing global settings
 * - Multiple "Session" objects representing individual pomodoro sessions
 *
 * Exogenous Actions:
 * - Timer.start(): Start a new pomodoro session
 * - Timer.pause(): Pause the current session
 * - Timer.resume(): Resume a paused session
 * - Timer.complete(): Mark current session as complete
 * - Timer.configure(): Change timer settings
 *
 * Public States:
 * - Timer: currentSessionId, totalSessions, settings
 * - Session: status, remainingSeconds, type, completedAt
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
  param,
  optionalParam,
  exogenousAction,
  internalAction,
  objectType
} from '../tool-helpers';

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

const timerStateVariables = [
  publicState('currentSessionId', z.string().nullable(), null, 'ID of the currently active session'),
  publicState('settings', TimerSettingsSchema, {
    workDurationMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    sessionsUntilLongBreak: 4
  }, 'Timer configuration settings'),
  publicState('totalSessions', z.number(), 0, 'Total number of completed sessions'),
  publicState('currentStreak', z.number(), 0, 'Current streak of completed work sessions'),
  readonlyState('lastSessionEndTime', z.date().nullable(), null, 'Timestamp of last session end'),
];

const sessionStateVariables = [
  publicState('status', SessionStatusSchema, 'active', 'Current status of the session'),
  publicState('type', SessionTypeSchema, 'work', 'Type of session'),
  publicState('durationSeconds', z.number(), 1500, 'Total duration in seconds'),
  publicState('elapsedSeconds', z.number(), 0, 'Elapsed time in seconds'),
  publicState('remainingSeconds', z.number(), 1500, 'Remaining time in seconds'),
  publicState('startedAt', z.date(), new Date(), 'Session start timestamp'),
  privateState('pausedAt', z.date().nullable(), null, 'Session pause timestamp'),
  publicState('completedAt', z.date().nullable(), null, 'Session completion timestamp'),
  publicState('associatedTaskId', z.string().nullable(), null, 'ID of associated GTD task'),
];

// ============================================================================
// Actions
// ============================================================================

const timerActions = [
  exogenousAction('start', {
    description: 'Start a new pomodoro session',
    params: [
      optionalParam('type', SessionTypeSchema, 'work', 'Type of session to start'),
      optionalParam('taskId', z.string(), undefined, 'Associated task ID'),
    ],
    affects: ['currentSessionId'],
    returns: z.object({ sessionId: z.string(), type: SessionTypeSchema, durationSeconds: z.number() })
  }),
  exogenousAction('pause', {
    description: 'Pause the current active session',
    affects: ['currentSessionId'],
    returns: z.object({ success: z.boolean(), pausedAt: z.date() })
  }),
  exogenousAction('resume', {
    description: 'Resume a paused session',
    affects: ['currentSessionId'],
    returns: z.object({ success: z.boolean(), resumedAt: z.date() })
  }),
  exogenousAction('complete', {
    description: 'Mark current session as complete',
    affects: ['currentSessionId', 'totalSessions', 'currentStreak', 'lastSessionEndTime'],
    returns: z.object({ success: z.boolean(), completedAt: z.date(), newStreak: z.number() })
  }),
  exogenousAction('configure', {
    description: 'Update timer settings',
    params: [param('settings', TimerSettingsSchema.partial(), true, 'New timer settings')],
    affects: ['settings'],
    returns: z.object({ success: z.boolean(), newSettings: TimerSettingsSchema })
  }),
  internalAction('tick', {
    description: 'Internal tick to update session time',
    affects: ['currentSessionId']
  }),
];

const sessionActions = [
  internalAction('updateProgress', {
    description: 'Update session elapsed/remaining time',
    params: [param('elapsedSeconds', z.number(), true, 'New elapsed time')],
    affects: ['elapsedSeconds', 'remainingSeconds']
  }),
  internalAction('setStatus', {
    description: 'Change session status',
    params: [param('status', SessionStatusSchema, true, 'New status')],
    affects: ['status', 'pausedAt', 'completedAt']
  }),
];

// ============================================================================
// Object Types & Tool Definition
// ============================================================================

const timerObjectType = objectType('Timer', {
  description: 'Singleton root object managing the pomodoro timer',
  root: true,
  states: timerStateVariables,
  actions: timerActions,
});

const sessionObjectType = objectType('Session', {
  description: 'Individual pomodoro session instance',
  states: sessionStateVariables,
  actions: sessionActions,
});

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
    taskContext: { currentTaskId: 'task-123' }
  },
  exampleOutput: {
    totalWorkTime: 3600,
    completedSessions: 4,
    currentStreak: 4,
    productivity: 87.5
  }
};

export const pomodoroToolDefinition = createToolDefinition(
  pomodoroMetadata,
  pomodoroIO,
  [timerObjectType, sessionObjectType]
);

// ============================================================================
// Executor
// ============================================================================

export class PomodoroToolExecutor extends BaseToolExecutor {
  constructor() {
    super(pomodoroToolDefinition, 'timer-root');
  }

  async initialize(input: unknown): Promise<ToolState> {
    const parsed = ToolInputSchema.parse(input);

    this.createRootInstance('Timer', {
      currentSessionId: null,
      settings: parsed.initialSettings ?? timerStateVariables[1].initialValue,
      totalSessions: 0,
      currentStreak: 0,
      lastSessionEndTime: null
    });

    if (parsed.taskContext) {
      this.getRootInstance().metadata = parsed.taskContext;
    }

    this.state.timestamp = new Date();
    return this.state;
  }

  // --- Action handlers (convention: action "start" → handleStart) -----------

  protected async handleStart(
    timerInstance: ObjectInstance,
    _context: ActionContext
  ): Promise<ActionResult> {
    const params = _context.parameters as { type?: string; taskId?: string };
    const sessionType = (params.type ?? 'work') as 'work' | 'short_break' | 'long_break';

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

    const stateChanges = new Map<string, unknown>();
    stateChanges.set('currentSessionId', sessionId);
    timerInstance.state.currentSessionId = sessionId;
    timerInstance.updatedAt = new Date();

    return {
      success: true,
      output: { sessionId, type: sessionType, durationSeconds },
      stateChanges
    };
  }

  protected async handlePause(
    timerInstance: ObjectInstance,
    _context: ActionContext
  ): Promise<ActionResult> {
    const currentSessionId = timerInstance.state.currentSessionId as string | null;
    if (!currentSessionId) {
      return { success: false, error: 'No active session to pause', stateChanges: new Map() };
    }

    const session = this.state.instances.get(currentSessionId);
    if (!session) {
      return { success: false, error: 'Current session not found', stateChanges: new Map() };
    }

    const now = new Date();
    session.state.status = 'paused';
    session.state.pausedAt = now;
    session.updatedAt = now;

    const stateChanges = new Map<string, unknown>();
    stateChanges.set('status', 'paused');
    stateChanges.set('pausedAt', now);

    return { success: true, output: { success: true, pausedAt: now }, stateChanges };
  }

  protected async handleResume(
    timerInstance: ObjectInstance,
    _context: ActionContext
  ): Promise<ActionResult> {
    const currentSessionId = timerInstance.state.currentSessionId as string | null;
    if (!currentSessionId) {
      return { success: false, error: 'No session to resume', stateChanges: new Map() };
    }

    const session = this.state.instances.get(currentSessionId);
    if (!session || session.state.status !== 'paused') {
      return { success: false, error: 'Session is not paused', stateChanges: new Map() };
    }

    const now = new Date();
    session.state.status = 'active';
    session.state.pausedAt = null;
    session.updatedAt = now;

    const stateChanges = new Map<string, unknown>();
    stateChanges.set('status', 'active');
    stateChanges.set('pausedAt', null);

    return { success: true, output: { success: true, resumedAt: now }, stateChanges };
  }

  protected async handleComplete(
    timerInstance: ObjectInstance,
    _context: ActionContext
  ): Promise<ActionResult> {
    const currentSessionId = timerInstance.state.currentSessionId as string | null;
    if (!currentSessionId) {
      return { success: false, error: 'No active session to complete', stateChanges: new Map() };
    }

    const session = this.state.instances.get(currentSessionId);
    if (!session) {
      return { success: false, error: 'Current session not found', stateChanges: new Map() };
    }

    const now = new Date();
    session.state.status = 'completed';
    session.state.completedAt = now;
    session.updatedAt = now;

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

  protected async handleConfigure(
    timerInstance: ObjectInstance,
    context: ActionContext
  ): Promise<ActionResult> {
    const params = context.parameters as { settings: Partial<z.infer<typeof TimerSettingsSchema>> };

    const currentSettings = timerInstance.state.settings as z.infer<typeof TimerSettingsSchema>;
    const newSettings = { ...currentSettings, ...params.settings };

    const result = TimerSettingsSchema.safeParse(newSettings);
    if (!result.success) {
      return { success: false, error: `Invalid settings: ${result.error.message}`, stateChanges: new Map() };
    }

    timerInstance.state.settings = result.data;
    timerInstance.updatedAt = new Date();

    const stateChanges = new Map<string, unknown>();
    stateChanges.set('settings', result.data);

    return {
      success: true,
      output: { success: true, newSettings: result.data },
      stateChanges
    };
  }
}
