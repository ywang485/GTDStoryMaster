/**
 * Tool Interface - Main Export
 *
 * This module provides a complete interface for defining and integrating
 * tools with the GTD Story Master. Tools are object-oriented state machines
 * that can be called by the AI agent and visualized externally.
 */

// Core interfaces and types
export type {
  ActionParameter,
  StateVariable,
  ActionDefinition,
  ObjectTypeDefinition,
  ToolMetadata,
  ToolIOSpecification,
  ToolDefinition,
  ObjectInstance,
  ActionContext,
  ActionResult,
  ToolState,
  ToolExecutor,
  ToolRegistry
} from './tool-interface';

// Utilities
export {
  ToolValidator,
  createToolDefinition
} from './tool-interface';

// Registry
export {
  DefaultToolRegistry,
  getGlobalToolRegistry,
  resetGlobalToolRegistry,
  registerGlobalTool,
  getGlobalTool,
  getGlobalToolsForLLM,
  getGlobalToolDescriptionsForPrompt
} from './tool-registry';

// Example tools
export {
  pomodoroToolDefinition,
  PomodoroToolExecutor
} from './examples/pomodoro-tool';

export {
  todoListToolDefinition,
  TodoListToolExecutor
} from './examples/todo-list-tool';
