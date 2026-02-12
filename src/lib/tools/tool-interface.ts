/**
 * Tool Interface Definition for GTD Story Master
 *
 * This module defines a general interface for tools that can be integrated
 * with the story master. Each tool is an object-oriented state machine with:
 * - Multiple object types, each with state variables and actions
 * - A singleton root object for global state
 * - Exogenous actions (externally triggerable) and public states (for visualization)
 * - Internal logic defining state transitions
 *
 * Similar to MCP (Model Context Protocol) but with explicit separation
 * between internal implementation and external visibility.
 */

import { z } from 'zod';

/**
 * Parameter definition for actions
 */
export interface ActionParameter {
  /** Parameter name */
  name: string;
  /** Human-readable description */
  description: string;
  /** JSON Schema for the parameter type */
  schema: z.ZodTypeAny;
  /** Whether the parameter is required */
  required: boolean;
  /** Default value if not required */
  defaultValue?: unknown;
}

/**
 * State variable definition
 */
export interface StateVariable {
  /** Variable name */
  name: string;
  /** Human-readable description */
  description: string;
  /** JSON Schema for the variable type */
  schema: z.ZodTypeAny;
  /** Whether this state is public (exposed for visualization) */
  isPublic: boolean;
  /** Initial value */
  initialValue: unknown;
  /** Whether the state is read-only (can only be changed by internal logic) */
  isReadOnly?: boolean;
  /** If provided, value is computed on-demand instead of stored. Receives the full ToolState. */
  compute?: (toolState: ToolState) => unknown;
}

/**
 * Action definition for object types
 */
export interface ActionDefinition {
  /** Action name */
  name: string;
  /** Human-readable description for LLM */
  description: string;
  /** Parameters for this action */
  parameters: ActionParameter[];
  /** Whether this is an exogenous action (externally triggerable) */
  isExogenous: boolean;
  /** Which state variables this action can modify */
  affectedStates: string[];
  /** Return type schema (if action produces output) */
  returnSchema?: z.ZodTypeAny;
}

/**
 * Object type definition within a tool
 */
export interface ObjectTypeDefinition {
  /** Object type name */
  typeName: string;
  /** Human-readable description */
  description: string;
  /** Whether this is the singleton root object */
  isRoot: boolean;
  /** State variables for this object type */
  states: StateVariable[];
  /** Actions available for this object type */
  actions: ActionDefinition[];
  /** Maximum number of instances (undefined = unlimited, 1 = singleton) */
  maxInstances?: number;
}

/**
 * Tool metadata for LLM integration
 */
export interface ToolMetadata {
  /** Tool name (unique identifier) */
  name: string;
  /** Version string (semver) */
  version: string;
  /** Brief description */
  description: string;
  /** Detailed usage description for LLM agent */
  usageDescription: string;
  /** Author/maintainer information */
  author?: string;
  /** Tool tags for categorization */
  tags?: string[];
}

/**
 * Input/Output specification for the tool
 */
export interface ToolIOSpecification {
  /** Input schema (what the tool accepts from external context) */
  inputSchema: z.ZodTypeAny;
  /** Output schema (what the tool returns to external context) */
  outputSchema: z.ZodTypeAny;
  /** Human-readable description of input */
  inputDescription: string;
  /** Human-readable description of output */
  outputDescription: string;
  /** Example input (for documentation) */
  exampleInput?: unknown;
  /** Example output (for documentation) */
  exampleOutput?: unknown;
}

/**
 * Complete tool interface definition
 *
 * This is the main interface that defines a tool's structure,
 * state machine, and external visibility.
 */
export interface ToolDefinition {
  /** Tool metadata */
  metadata: ToolMetadata;

  /** Tool input/output specification */
  io: ToolIOSpecification;

  /** Object types defined by this tool */
  objectTypes: ObjectTypeDefinition[];

  /**
   * Get the root object type definition
   * Must return exactly one root object type
   */
  getRootType(): ObjectTypeDefinition;

  /**
   * Get all exogenous actions across all object types
   * Returns a map of objectTypeName -> exogenous actions
   */
  getExogenousActions(): Map<string, ActionDefinition[]>;

  /**
   * Get all public states across all object types
   * Returns a map of objectTypeName -> public states
   */
  getPublicStates(): Map<string, StateVariable[]>;
}

/**
 * Runtime instance of an object within a tool
 */
export interface ObjectInstance<TState = Record<string, unknown>> {
  /** Unique instance ID */
  instanceId: string;
  /** Object type name */
  typeName: string;
  /** Current state values */
  state: TState;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modification timestamp */
  updatedAt: Date;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Action execution context
 */
export interface ActionContext<TInput = unknown> {
  /** ID of the object instance executing this action */
  instanceId: string;
  /** Action name */
  actionName: string;
  /** Action parameters */
  parameters: TInput;
  /** Timestamp of execution */
  timestamp: Date;
  /** Optional external context (e.g., from game state) */
  externalContext?: Record<string, unknown>;
}

/**
 * Action execution result
 */
export interface ActionResult<TOutput = unknown> {
  /** Whether the action succeeded */
  success: boolean;
  /** Output data (if any) */
  output?: TOutput;
  /** State changes applied (map of stateVariable -> newValue) */
  stateChanges: Map<string, unknown>;
  /** Error message if action failed */
  error?: string;
  /** Optional metadata about the execution */
  metadata?: Record<string, unknown>;
}

/**
 * Tool state snapshot (all object instances and their states)
 */
export interface ToolState {
  /** Tool name */
  toolName: string;
  /** Snapshot timestamp */
  timestamp: Date;
  /** All object instances keyed by instanceId */
  instances: Map<string, ObjectInstance>;
  /** Tool-level metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Tool executor interface
 *
 * Implementations of this interface handle the actual execution
 * of actions and state management for a tool.
 */
export interface ToolExecutor {
  /** Tool definition */
  definition: ToolDefinition;

  /**
   * Initialize the tool with input data
   * Creates the root object and sets initial state
   */
  initialize(input: unknown): Promise<ToolState>;

  /**
   * Execute an action on an object instance
   */
  executeAction(context: ActionContext): Promise<ActionResult>;

  /**
   * Get the current state of the tool
   */
  getState(): ToolState;

  /**
   * Get the current state of a specific object instance
   */
  getInstance(instanceId: string): ObjectInstance | undefined;

  /**
   * Get all instances of a specific object type
   */
  getInstancesByType(typeName: string): ObjectInstance[];

  /**
   * Export public states for external visualization
   * Returns only the public states of all instances
   */
  exportPublicStates(): Record<string, Record<string, unknown>>;

  /**
   * Create a new instance of an object type (via root object)
   * This is typically called through a root action
   */
  createInstance(typeName: string, initialState?: Record<string, unknown>): Promise<ObjectInstance>;

  /**
   * Destroy an instance (via root object)
   * Root object cannot be destroyed
   */
  destroyInstance(instanceId: string): Promise<boolean>;

  /**
   * Reset the tool to initial state
   */
  reset(): Promise<void>;
}

/**
 * Tool registry interface
 * Manages multiple tools and their executors
 */
export interface ToolRegistry {
  /**
   * Register a tool
   */
  registerTool(definition: ToolDefinition, executor: ToolExecutor): void;

  /**
   * Get a tool by name
   */
  getTool(name: string): ToolExecutor | undefined;

  /**
   * Get all registered tools
   */
  getAllTools(): Map<string, ToolExecutor>;

  /**
   * Unregister a tool
   */
  unregisterTool(name: string): boolean;

  /**
   * Get tool definitions for LLM context
   * Returns metadata and exogenous actions for all tools
   */
  getToolsForLLM(): Array<{
    metadata: ToolMetadata;
    io: ToolIOSpecification;
    exogenousActions: Map<string, ActionDefinition[]>;
  }>;
}

/**
 * Validation utilities
 */
export class ToolValidator {
  /**
   * Validate a tool definition
   * Ensures:
   * - Exactly one root object type exists
   * - All state and action references are valid
   * - Schemas are valid Zod schemas
   */
  static validateDefinition(definition: ToolDefinition): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Check for exactly one root type
    const rootTypes = definition.objectTypes.filter(t => t.isRoot);
    if (rootTypes.length === 0) {
      errors.push('Tool must have exactly one root object type');
    } else if (rootTypes.length > 1) {
      errors.push(`Tool has ${rootTypes.length} root types, but must have exactly one`);
    }

    // Check that root type is defined correctly
    try {
      const root = definition.getRootType();
      if (!root.isRoot) {
        errors.push('getRootType() returned a non-root type');
      }
    } catch (e) {
      errors.push(`getRootType() failed: ${e}`);
    }

    // Validate each object type
    for (const objType of definition.objectTypes) {
      // Check state variable schemas
      for (const state of objType.states) {
        if (!state.schema) {
          errors.push(`State ${objType.typeName}.${state.name} missing schema`);
        }
      }

      // Check action definitions
      for (const action of objType.actions) {
        // Verify affected states exist
        for (const affectedState of action.affectedStates) {
          const stateExists = objType.states.some(s => s.name === affectedState);
          if (!stateExists) {
            errors.push(
              `Action ${objType.typeName}.${action.name} references non-existent state: ${affectedState}`
            );
          }
        }

        // Check parameter schemas
        for (const param of action.parameters) {
          if (!param.schema) {
            errors.push(`Parameter ${action.name}.${param.name} missing schema`);
          }
        }
      }
    }

    // Validate IO schemas
    if (!definition.io.inputSchema) {
      errors.push('Tool missing input schema');
    }
    if (!definition.io.outputSchema) {
      errors.push('Tool missing output schema');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Validate an action execution context against the tool definition
   */
  static validateActionContext(
    definition: ToolDefinition,
    context: ActionContext
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Find the action definition
    let actionDef: ActionDefinition | undefined;
    let objectType: ObjectTypeDefinition | undefined;

    for (const objType of definition.objectTypes) {
      const found = objType.actions.find(a => a.name === context.actionName);
      if (found) {
        actionDef = found;
        objectType = objType;
        break;
      }
    }

    if (!actionDef || !objectType) {
      errors.push(`Action ${context.actionName} not found in tool definition`);
      return { valid: false, errors };
    }

    // Validate required parameters
    for (const param of actionDef.parameters) {
      if (param.required && !(param.name in (context.parameters as object))) {
        errors.push(`Missing required parameter: ${param.name}`);
      }
    }

    // Validate parameter types using Zod
    for (const param of actionDef.parameters) {
      if (param.name in (context.parameters as object)) {
        const result = param.schema.safeParse((context.parameters as Record<string, unknown>)[param.name]);
        if (!result.success) {
          errors.push(`Invalid parameter ${param.name}: ${result.error.message}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

/**
 * Helper function to create a tool definition
 * Provides a builder pattern for easier tool construction
 */
export function createToolDefinition(
  metadata: ToolMetadata,
  io: ToolIOSpecification,
  objectTypes: ObjectTypeDefinition[]
): ToolDefinition {
  return {
    metadata,
    io,
    objectTypes,
    getRootType: () => {
      const roots = objectTypes.filter(t => t.isRoot);
      if (roots.length !== 1) {
        throw new Error(`Expected exactly one root type, found ${roots.length}`);
      }
      return roots[0];
    },
    getExogenousActions: () => {
      const map = new Map<string, ActionDefinition[]>();
      for (const objType of objectTypes) {
        const exogenous = objType.actions.filter(a => a.isExogenous);
        if (exogenous.length > 0) {
          map.set(objType.typeName, exogenous);
        }
      }
      return map;
    },
    getPublicStates: () => {
      const map = new Map<string, StateVariable[]>();
      for (const objType of objectTypes) {
        const publicStates = objType.states.filter(s => s.isPublic);
        if (publicStates.length > 0) {
          map.set(objType.typeName, publicStates);
        }
      }
      return map;
    }
  };
}
