/**
 * Tool Definition Helpers
 *
 * Builder functions that reduce boilerplate when defining tools.
 * These produce the same StateVariable, ActionParameter, ActionDefinition,
 * and ObjectTypeDefinition types — existing verbose definitions still work.
 */

import { z } from 'zod';
import type {
  StateVariable,
  ActionParameter,
  ActionDefinition,
  ObjectTypeDefinition,
  ToolState
} from './tool-interface';

// ============================================================================
// Utility
// ============================================================================

/** Convert camelCase name to human-readable description (e.g., 'totalTasks' → 'Total tasks') */
function humanize(name: string): string {
  const words = name.replace(/([A-Z])/g, ' $1').trim();
  return words.charAt(0).toUpperCase() + words.slice(1).toLowerCase();
}

// ============================================================================
// State Variable Helpers
// ============================================================================

/** Define a public state variable (exposed for visualization) */
export function publicState(
  name: string,
  schema: z.ZodTypeAny,
  initialValue: unknown,
  description?: string
): StateVariable {
  return { name, description: description ?? humanize(name), schema, isPublic: true, initialValue };
}

/** Define a private state variable (internal only) */
export function privateState(
  name: string,
  schema: z.ZodTypeAny,
  initialValue: unknown,
  description?: string
): StateVariable {
  return { name, description: description ?? humanize(name), schema, isPublic: false, initialValue };
}

/** Define a private, read-only state variable (only changed by internal logic) */
export function readonlyState(
  name: string,
  schema: z.ZodTypeAny,
  initialValue: unknown,
  description?: string
): StateVariable {
  return { name, description: description ?? humanize(name), schema, isPublic: false, initialValue, isReadOnly: true };
}

/** Define a computed public state variable (derived on-demand from tool state) */
export function computedState(
  name: string,
  schema: z.ZodTypeAny,
  compute: (toolState: ToolState) => unknown,
  description?: string
): StateVariable {
  return { name, description: description ?? humanize(name), schema, isPublic: true, initialValue: undefined, compute };
}

// ============================================================================
// Action Parameter Helper
// ============================================================================

/** Define an action parameter. Defaults to required. */
export function param(
  name: string,
  schema: z.ZodTypeAny,
  required = true,
  description?: string
): ActionParameter {
  return { name, description: description ?? humanize(name), schema, required };
}

/** Define an optional action parameter with a default value. */
export function optionalParam(
  name: string,
  schema: z.ZodTypeAny,
  defaultValue?: unknown,
  description?: string
): ActionParameter {
  return { name, description: description ?? humanize(name), schema, required: false, defaultValue };
}

// ============================================================================
// Action Helpers
// ============================================================================

/** Define an exogenous (externally triggerable) action. */
export function exogenousAction(
  name: string,
  config: {
    description?: string;
    params?: ActionParameter[];
    affects?: string[];
    returns?: z.ZodTypeAny;
  } = {}
): ActionDefinition {
  return {
    name,
    description: config.description ?? humanize(name),
    parameters: config.params ?? [],
    isExogenous: true,
    affectedStates: config.affects ?? [],
    returnSchema: config.returns
  };
}

/** Define an internal action (not externally triggerable). */
export function internalAction(
  name: string,
  config: {
    description?: string;
    params?: ActionParameter[];
    affects?: string[];
  } = {}
): ActionDefinition {
  return {
    name,
    description: config.description ?? humanize(name),
    parameters: config.params ?? [],
    isExogenous: false,
    affectedStates: config.affects ?? []
  };
}

// ============================================================================
// Object Type Helper
// ============================================================================

/** Define an object type. Set `root: true` for the singleton root object. */
export function objectType(
  typeName: string,
  config: {
    description?: string;
    root?: boolean;
    states: StateVariable[];
    actions: ActionDefinition[];
    maxInstances?: number;
  }
): ObjectTypeDefinition {
  return {
    typeName,
    description: config.description ?? typeName,
    isRoot: config.root ?? false,
    states: config.states,
    actions: config.actions,
    maxInstances: config.root ? 1 : config.maxInstances
  };
}
