/**
 * Tool Registry Implementation
 *
 * Manages multiple tools and their executors, providing:
 * - Tool registration and lifecycle management
 * - Tool lookup and retrieval
 * - LLM-friendly tool descriptions
 * - Validation and error handling
 */

import {
  ToolDefinition,
  ToolExecutor,
  ToolRegistry,
  ToolMetadata,
  ToolIOSpecification,
  ActionDefinition,
  ToolValidator
} from './tool-interface';

/**
 * Default implementation of ToolRegistry
 */
export class DefaultToolRegistry implements ToolRegistry {
  private tools: Map<string, ToolExecutor>;
  private definitions: Map<string, ToolDefinition>;

  constructor() {
    this.tools = new Map();
    this.definitions = new Map();
  }

  registerTool(definition: ToolDefinition, executor: ToolExecutor): void {
    // Validate the tool definition
    const validation = ToolValidator.validateDefinition(definition);
    if (!validation.valid) {
      throw new Error(
        `Invalid tool definition for ${definition.metadata.name}:\n${validation.errors.join('\n')}`
      );
    }

    // Check if tool already exists
    if (this.tools.has(definition.metadata.name)) {
      throw new Error(`Tool ${definition.metadata.name} is already registered`);
    }

    // Ensure executor has the same definition
    if (executor.definition !== definition) {
      console.warn(
        `Executor definition mismatch for ${definition.metadata.name}. Using provided definition.`
      );
      executor.definition = definition;
    }

    this.tools.set(definition.metadata.name, executor);
    this.definitions.set(definition.metadata.name, definition);

    console.log(
      `Registered tool: ${definition.metadata.name} v${definition.metadata.version}`
    );
  }

  getTool(name: string): ToolExecutor | undefined {
    return this.tools.get(name);
  }

  getAllTools(): Map<string, ToolExecutor> {
    return new Map(this.tools);
  }

  unregisterTool(name: string): boolean {
    const hasDefinition = this.definitions.delete(name);
    const hasTool = this.tools.delete(name);

    if (hasTool) {
      console.log(`Unregistered tool: ${name}`);
    }

    return hasTool || hasDefinition;
  }

  getToolsForLLM(): Array<{
    metadata: ToolMetadata;
    io: ToolIOSpecification;
    exogenousActions: Map<string, ActionDefinition[]>;
  }> {
    const result: Array<{
      metadata: ToolMetadata;
      io: ToolIOSpecification;
      exogenousActions: Map<string, ActionDefinition[]>;
    }> = [];

    for (const definition of this.definitions.values()) {
      result.push({
        metadata: definition.metadata,
        io: definition.io,
        exogenousActions: definition.getExogenousActions()
      });
    }

    return result;
  }

  /**
   * Get a formatted description of all tools for LLM prompt injection
   * Returns a markdown-formatted string suitable for system prompts
   */
  getToolDescriptionsForPrompt(): string {
    const tools = this.getToolsForLLM();
    if (tools.length === 0) {
      return 'No tools available.';
    }

    let prompt = '# Available Tools\n\n';
    prompt += 'The following tools are available for integration with the story:\n\n';

    for (const tool of tools) {
      prompt += `## ${tool.metadata.name} (v${tool.metadata.version})\n\n`;
      prompt += `${tool.metadata.description}\n\n`;

      if (tool.metadata.tags && tool.metadata.tags.length > 0) {
        prompt += `**Tags**: ${tool.metadata.tags.join(', ')}\n\n`;
      }

      prompt += `### Usage\n\n${tool.metadata.usageDescription}\n\n`;

      prompt += `### Input\n\n${tool.io.inputDescription}\n\n`;
      prompt += `### Output\n\n${tool.io.outputDescription}\n\n`;

      // List exogenous actions
      prompt += '### Available Actions\n\n';
      for (const [objectType, actions] of tool.exogenousActions) {
        prompt += `**${objectType}**:\n\n`;
        for (const action of actions) {
          prompt += `- \`${action.name}\`: ${action.description}\n`;

          if (action.parameters.length > 0) {
            prompt += '  - Parameters:\n';
            for (const param of action.parameters) {
              const requiredText = param.required ? 'required' : 'optional';
              prompt += `    - \`${param.name}\` (${requiredText}): ${param.description}\n`;
            }
          }

          if (action.returnSchema) {
            prompt += `  - Returns: ${action.returnSchema.description || 'structured data'}\n`;
          }

          prompt += '\n';
        }
      }

      prompt += '---\n\n';
    }

    return prompt;
  }

  /**
   * Get tool statistics
   */
  getStatistics(): {
    totalTools: number;
    totalObjectTypes: number;
    totalExogenousActions: number;
    toolsByTag: Map<string, string[]>;
  } {
    const toolsByTag = new Map<string, string[]>();
    let totalObjectTypes = 0;
    let totalExogenousActions = 0;

    for (const definition of this.definitions.values()) {
      // Count object types
      totalObjectTypes += definition.objectTypes.length;

      // Count exogenous actions
      for (const actions of definition.getExogenousActions().values()) {
        totalExogenousActions += actions.length;
      }

      // Group by tags
      if (definition.metadata.tags) {
        for (const tag of definition.metadata.tags) {
          if (!toolsByTag.has(tag)) {
            toolsByTag.set(tag, []);
          }
          toolsByTag.get(tag)!.push(definition.metadata.name);
        }
      }
    }

    return {
      totalTools: this.tools.size,
      totalObjectTypes,
      totalExogenousActions,
      toolsByTag
    };
  }

  /**
   * Validate all registered tools
   * Returns validation results for each tool
   */
  validateAllTools(): Map<string, { valid: boolean; errors: string[] }> {
    const results = new Map<string, { valid: boolean; errors: string[] }>();

    for (const [name, definition] of this.definitions) {
      results.set(name, ToolValidator.validateDefinition(definition));
    }

    return results;
  }

  /**
   * Export all tool states
   * Useful for debugging or persistence
   */
  exportAllStates(): Record<string, unknown> {
    const states: Record<string, unknown> = {};

    for (const [name, executor] of this.tools) {
      states[name] = {
        toolState: executor.getState(),
        publicStates: executor.exportPublicStates()
      };
    }

    return states;
  }

  /**
   * Clear all tools
   * Useful for testing or reset scenarios
   */
  clear(): void {
    this.tools.clear();
    this.definitions.clear();
    console.log('Cleared all registered tools');
  }
}

/**
 * Singleton instance of the tool registry
 * Use this for global tool management
 */
let globalRegistry: DefaultToolRegistry | null = null;

/**
 * Get the global tool registry instance
 */
export function getGlobalToolRegistry(): DefaultToolRegistry {
  if (!globalRegistry) {
    globalRegistry = new DefaultToolRegistry();
  }
  return globalRegistry;
}

/**
 * Reset the global tool registry
 * Primarily for testing
 */
export function resetGlobalToolRegistry(): void {
  if (globalRegistry) {
    globalRegistry.clear();
  }
  globalRegistry = null;
}

/**
 * Helper function to register a tool globally
 */
export function registerGlobalTool(definition: ToolDefinition, executor: ToolExecutor): void {
  const registry = getGlobalToolRegistry();
  registry.registerTool(definition, executor);
}

/**
 * Helper function to get a tool from the global registry
 */
export function getGlobalTool(name: string): ToolExecutor | undefined {
  const registry = getGlobalToolRegistry();
  return registry.getTool(name);
}

/**
 * Helper function to get all tools for LLM context
 */
export function getGlobalToolsForLLM(): Array<{
  metadata: ToolMetadata;
  io: ToolIOSpecification;
  exogenousActions: Map<string, ActionDefinition[]>;
}> {
  const registry = getGlobalToolRegistry();
  return registry.getToolsForLLM();
}

/**
 * Helper function to get formatted tool descriptions for LLM prompts
 */
export function getGlobalToolDescriptionsForPrompt(): string {
  const registry = getGlobalToolRegistry();
  return registry.getToolDescriptionsForPrompt();
}
