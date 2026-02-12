/**
 * Base Tool Executor
 *
 * Abstract base class that implements all shared ToolExecutor boilerplate.
 * Subclasses only need to implement:
 *   - initialize(input): set up root instance and initial state
 *   - handle<ActionName>(instance, context): one method per action
 *
 * Action routing is convention-based: an action named "createTask" is
 * routed to this.handleCreateTask(instance, context).
 */

import {
  ToolDefinition,
  ToolExecutor,
  ToolState,
  ObjectInstance,
  ActionContext,
  ActionResult
} from './tool-interface';

export abstract class BaseToolExecutor implements ToolExecutor {
  definition: ToolDefinition;
  protected state: ToolState;
  protected rootInstanceId: string;

  constructor(definition: ToolDefinition, rootInstanceId: string) {
    this.definition = definition;
    this.rootInstanceId = rootInstanceId;
    this.state = {
      toolName: definition.metadata.name,
      timestamp: new Date(),
      instances: new Map()
    };
  }

  // ---------------------------------------------------------------------------
  // Abstract — subclass must implement
  // ---------------------------------------------------------------------------

  abstract initialize(input: unknown): Promise<ToolState>;

  // ---------------------------------------------------------------------------
  // Convention-based action routing
  // ---------------------------------------------------------------------------

  async executeAction(context: ActionContext): Promise<ActionResult> {
    const instance = this.state.instances.get(context.instanceId);
    if (!instance) {
      return {
        success: false,
        error: `Instance ${context.instanceId} not found`,
        stateChanges: new Map()
      };
    }

    // action "createTask" → handler "handleCreateTask"
    const handlerName = `handle${context.actionName.charAt(0).toUpperCase()}${context.actionName.slice(1)}`;
    const handler = (this as Record<string, unknown>)[handlerName];

    if (typeof handler === 'function') {
      return (handler as (instance: ObjectInstance, context: ActionContext) => Promise<ActionResult>)
        .call(this, instance, context);
    }

    return {
      success: false,
      error: `Unknown action: ${context.actionName}`,
      stateChanges: new Map()
    };
  }

  // ---------------------------------------------------------------------------
  // Shared implementations (identical across tools)
  // ---------------------------------------------------------------------------

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
          publicState[stateVar.name] = stateVar.compute
            ? stateVar.compute(this.state)
            : instance.state[stateVar.name];
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

    if (objectType.maxInstances !== undefined) {
      const existing = this.getInstancesByType(typeName);
      if (existing.length >= objectType.maxInstances) {
        throw new Error(`Maximum instances (${objectType.maxInstances}) reached for ${typeName}`);
      }
    }

    const instanceId = `${typeName.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const state: Record<string, unknown> = {};

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

    const rootType = this.definition.getRootType();
    if (instance.typeName === rootType.typeName) {
      throw new Error('Cannot destroy root instance');
    }

    return this.state.instances.delete(instanceId);
  }

  async reset(): Promise<void> {
    const rootInstance = this.state.instances.get(this.rootInstanceId);
    this.state.instances.clear();

    if (rootInstance) {
      const rootType = this.definition.getRootType();
      for (const stateVar of rootType.states) {
        if (!stateVar.compute) {
          rootInstance.state[stateVar.name] = stateVar.initialValue;
        }
      }
      rootInstance.updatedAt = new Date();
      this.state.instances.set(this.rootInstanceId, rootInstance);
    }

    this.state.timestamp = new Date();
  }

  // ---------------------------------------------------------------------------
  // Utility helpers for subclasses
  // ---------------------------------------------------------------------------

  protected getRootInstance(): ObjectInstance {
    const instance = this.state.instances.get(this.rootInstanceId);
    if (!instance) {
      throw new Error('Root instance not found');
    }
    return instance;
  }

  protected createRootInstance(typeName: string, state: Record<string, unknown>): ObjectInstance {
    const instance: ObjectInstance = {
      instanceId: this.rootInstanceId,
      typeName,
      state,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.state.instances.set(this.rootInstanceId, instance);
    return instance;
  }
}
