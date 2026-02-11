# StoryWorld System Documentation

## Overview

The **StoryWorld System** defines interactive storyworlds as object-oriented state machines focused on **presentation and user interaction**. While the **Tool System** handles data processing and logic, the **StoryWorld System** handles visual/audio rendering and interactive feedback.

## Architecture

```
┌─────────────────────────────────────────────────┐
│         StoryWorld (Presentation)               │
│                                                 │
│  • Visual Rendering (sprites, animations)      │
│  • Audio Playback (SFX, music)                 │
│  • User Interaction (visual feedback)          │
│  • Narrative Display                           │
│                                                 │
│  Object-Oriented State Machine                 │
└─────────────────────────────────────────────────┘
                      ▲
                      │ Can be bound to
                      ▼
┌─────────────────────────────────────────────────┐
│            Tool (Data Processing)               │
│                                                 │
│  • Data Management (task lists, timers)        │
│  • Business Logic (state validation)           │
│  • State Persistence                           │
│                                                 │
│  State Machine                                 │
└─────────────────────────────────────────────────┘
```

## Key Concepts

### 1. **Object Types**

Object types are classes of interactive objects in the storyworld (e.g., Hero, Monster, Item, Location).

Each object type defines:
- **State Variables**: Data that tracks the object's state
- **Actions**: Operations that can be performed on the object
- **Assets**: Visual/audio resources for rendering
- **Action Logic**: How actions modify state and trigger rendering

**Example:**
```typescript
{
  id: "hero",
  name: "Hero",
  stateVariables: [
    { name: "health", type: "number", default: 100 },
    { name: "position", type: "object", default: { x: 0, y: 0 } },
    { name: "inventory", type: "array", default: [] }
  ],
  actions: [
    { id: "move", ... },
    { id: "attack", ... },
    { id: "use_item", ... }
  ],
  assets: { ... }
}
```

### 2. **State Variables**

Variables that track the state of an object or the world.

```typescript
{
  name: "health",
  type: "number",
  description: "Current health points",
  default: 100,
  validation: { min: 0, max: 100 }
}
```

**Types:** `string`, `number`, `boolean`, `object`, `array`

### 3. **Actions**

Parameterized operations that:
1. Check preconditions
2. Modify state
3. Trigger rendering (animations, sounds, particles)
4. Generate narrative text
5. Execute side effects

**Example:**
```typescript
{
  id: "attack",
  name: "Attack",
  parameters: [
    { name: "targetId", type: "string", required: true },
    { name: "damage", type: "number", default: 10 }
  ],
  logic: {
    preconditions: [
      { variable: "health", operator: ">", value: 0 }
    ],
    stateChanges: [
      { variable: "stamina", operation: "subtract", value: 5 }
    ],
    renderInstructions: [
      { type: "play_animation", assetId: "hero-attack", duration: 600 },
      { type: "play_sound", assetId: "sword-slash" },
      { type: "show_particle", assetId: "hit-spark", duration: 300 }
    ],
    sideEffects: [
      { action: "take_damage", params: { amount: 10 } }
    ],
    narrativeText: "The hero attacks the monster!"
  }
}
```

### 4. **Assets**

Visual and audio resources tied to states, transitions, and actions.

**Asset Types:**
- `sprite`: 2D images
- `model`: 3D models
- `animation`: Animation sequences
- `sound`: Sound effects
- `music`: Background music
- `particle`: Particle effects
- `shader`: Visual shaders
- `video`: Video clips

**Asset Organization:**
```typescript
assets: {
  // Assets for specific states
  stateAssets: {
    idle: [{ id: "hero-idle-sprite", type: "sprite", url: "..." }],
    damaged: [{ id: "hero-hurt-sprite", type: "sprite", url: "..." }]
  },

  // Assets for state transitions
  transitionAssets: {
    "idle->running": [{ id: "start-run", type: "animation", url: "..." }]
  },

  // Assets for actions
  actionAssets: {
    attack: [
      { id: "attack-anim", type: "animation", url: "..." },
      { id: "sword-sound", type: "sound", url: "..." }
    ]
  }
}
```

### 5. **Render Instructions**

Instructions for the rendering engine to display visuals/audio.

```typescript
{
  type: "play_animation",
  assetId: "hero-attack",
  duration: 600,
  position: { x: 100, y: 200 },
  scale: 1.5,
  transition: { type: "fade", duration: 200 }
}
```

**Instruction Types:**
- `play_animation`: Play animation sequence
- `show_sprite`: Display sprite
- `play_sound`: Play sound effect
- `play_music`: Play background music
- `show_particle`: Display particle effect
- `apply_shader`: Apply visual shader
- `display_text`: Display narrative text
- `play_video`: Play video

### 6. **Narrative Rendering**

Every storyworld has a built-in root-level action for rendering narrative text:

```typescript
narrativeRenderer: {
  action: {
    id: "render_narrative",
    name: "Render Narrative",
    parameters: [{ name: "text", type: "string", required: true }],
    logic: { ... }
  },
  defaultStyle: {
    fontSize: 18,
    fontFamily: "Georgia, serif",
    animation: "typewriter",
    speed: 50
  },
  template: (text, context) => `[${timestamp}] ${text}`
}
```

## StoryWorld Executor

The runtime engine that executes storyworld state machines.

### Creating an Executor

```typescript
import { createStoryWorldExecutor } from "@/lib/storyworld";
import { fantasyWorld } from "@/lib/storyworld/examples/fantasy-world";

const executor = createStoryWorldExecutor(fantasyWorld);
```

### Core Operations

#### 1. Create Object Instance

```typescript
const result = executor.createObject("hero", "hero-1", {
  health: 100,
  position: { x: 0, y: 0 }
});
```

#### 2. Execute Action

```typescript
const result = await executor.executeAction("hero-1", "attack", {
  targetId: "monster-1",
  damage: 15
});

console.log(result.narrativeText);
// "The hero attacks monster-1 for 15 damage!"

console.log(result.renderInstructions);
// [{ type: "play_animation", assetId: "hero-attack", ... }]
```

#### 3. Render Narrative

```typescript
const result = await executor.renderNarrative(
  "The hero enters the dark forest..."
);
```

#### 4. Get State

```typescript
// Get full state
const state = executor.getState();

// Get specific object
const hero = executor.getObject("hero-1");

// Get public state (for AI/external systems)
const publicState = executor.getPublicState();
```

## Action Result

Every action returns an `ActionResult`:

```typescript
{
  success: boolean;

  // State changes applied
  stateChanges?: StateChange[];

  // Rendering instructions to execute
  renderInstructions?: RenderInstruction[];

  // Narrative text generated
  narrativeText?: string;

  // Side effects triggered
  sideEffects?: Array<{
    objectId: string;
    action: string;
    result: ActionResult;
  }>;

  // Error if failed
  error?: {
    code: string;
    message: string;
  };
}
```

## Tool-to-StoryWorld Binding (Future)

Storyworlds can be bound to tools to visually render tool actions and states.

```typescript
{
  toolId: "TodoList",
  storyWorldId: "fantasy-world",

  actionMappings: [
    {
      toolAction: "createTask",
      storyWorldObjectType: "quest",
      storyWorldAction: "accept_quest",
      parameterMapping: {
        title: "questName",
        description: "questDescription"
      }
    },
    {
      toolAction: "updateTaskStatus",
      storyWorldObjectType: "quest",
      storyWorldAction: "update_progress"
    }
  ],

  stateMappings: [
    {
      toolState: "task.status",
      storyWorldObjectId: "quest-board",
      storyWorldStateVariable: "questStatus",
      transformation: (status) => ({
        pending: "available",
        in_progress: "active",
        completed: "finished"
      }[status])
    }
  ]
}
```

### Example Binding Flow

```
Tool Action                    StoryWorld Rendering
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

createTask("Write report")  →  Quest appears on quest board
                               + Sparkle animation
                               + Quest acceptance sound
                               + Narrative: "A new quest appears!"

updateTaskStatus(            →  Quest marker updates
  "task-1",                     + Progress bar animation
  "in_progress"                 + Start quest music
)                               + Narrative: "The quest begins!"

updateTaskStatus(            →  Quest complete animation
  "task-1",                     + Victory fanfare
  "completed"                   + Experience points popup
)                               + Narrative: "Quest completed!"
```

## Complete Example

```typescript
import { createStoryWorldExecutor } from "@/lib/storyworld";
import { fantasyWorld } from "@/lib/storyworld/examples/fantasy-world";

// Create executor
const world = createStoryWorldExecutor(fantasyWorld);

// Create hero
world.createObject("hero", "hero-1", {
  health: 100,
  position: { x: 0, y: 0 },
  inventory: ["health-potion", "sword"]
});

// Create monster
world.createObject("monster", "monster-1", {
  health: 50,
  position: { x: 5, y: 5 }
});

// Render opening narrative
await world.renderNarrative("The hero enters the dark forest...");

// Hero moves
const moveResult = await world.executeAction("hero-1", "move", {
  x: 5,
  y: 5
});
// Triggers: walk animation, footstep sounds
// Narrative: "The hero moves to (5, 5)"

// Hero attacks monster
const attackResult = await world.executeAction("hero-1", "attack", {
  targetId: "monster-1",
  damage: 20
});
// Triggers:
// - Hero attack animation
// - Sword slash sound
// - Hit spark particle effect
// - Monster hurt animation (side effect)
// - Monster pain sound (side effect)
// Narrative: "The hero attacks monster-1 for 20 damage!"

// Check state
const hero = world.getObject("hero-1");
console.log(hero.state.health); // 100

const monster = world.getObject("monster-1");
console.log(monster.state.health); // 30 (50 - 20)

// Get public state (for AI)
const publicState = world.getPublicState();
console.log(publicState.recentNarrative);
// [
//   "The hero enters the dark forest...",
//   "The hero moves to (5, 5)",
//   "The hero attacks monster-1 for 20 damage!"
// ]
```

## Comparison: Tools vs StoryWorlds

| Aspect | Tools | StoryWorlds |
|--------|-------|-------------|
| **Purpose** | Data processing | Presentation |
| **Focus** | Logic & state | Visuals & audio |
| **State** | Data-oriented | Render-oriented |
| **Actions** | Modify data | Trigger rendering |
| **Assets** | None | Sprites, sounds, animations |
| **Output** | Data changes | Visual/audio feedback |
| **User Interaction** | API calls | Visual interaction |
| **Examples** | TodoList, Pomodoro | Fantasy world, Sci-fi world |

## File Structure

```
src/
├── types/
│   └── storyworld-definition.ts      # Type definitions
├── lib/
│   └── storyworld/
│       ├── index.ts                  # Public exports
│       ├── storyworld-executor.ts    # Runtime engine
│       └── examples/
│           └── fantasy-world.ts      # Example storyworld
└── stores/
    └── use-storyworld-store.ts       # Zustand store (future)
```

## Future Enhancements

### 1. **StoryWorld Store**
Create a Zustand store for managing storyworld instances in the app:

```typescript
interface StoryWorldStore {
  worlds: Record<string, StoryWorldExecutor>;
  activeWorldId: string | null;

  loadWorld: (definition: StoryWorldDefinition) => void;
  executeAction: (worldId: string, objectId: string, action: string, params?: any) => Promise<ActionResult>;
  getPublicStates: (worldId: string) => StoryWorldPublicState;
}
```

### 2. **Renderer Component**
React component for rendering storyworld visuals:

```typescript
<StoryWorldRenderer
  worldId="fantasy-world"
  executor={executor}
  onActionComplete={(result) => console.log(result)}
/>
```

### 3. **Tool Binding System**
Implement the binding layer to connect tools to storyworlds:

```typescript
const binding = createToolBinding(todoListTool, fantasyWorld, {
  actionMappings: [...],
  stateMappings: [...]
});

// When tool action executes, trigger storyworld rendering
binding.on("toolAction", (action, result) => {
  // Render visual feedback in storyworld
});
```

### 4. **Asset Pipeline**
- Asset loading and caching
- Sprite sheet management
- Animation timeline control
- Audio mixing and spatialization

### 5. **Physics & Collision**
- Add physics simulation for object movement
- Collision detection between objects
- Pathfinding for navigation actions

### 6. **Multiplayer Support**
- Synchronize storyworld state across clients
- Handle concurrent actions
- Replicate rendering across instances

## Best Practices

### 1. **State Design**
- Keep state minimal and focused
- Use validation to prevent invalid states
- Design for serializability (JSON-compatible)

### 2. **Action Design**
- Make actions atomic and predictable
- Use preconditions to validate state
- Return clear error messages

### 3. **Asset Organization**
- Group assets by state/action
- Use consistent naming conventions
- Optimize asset sizes for performance

### 4. **Narrative Integration**
- Generate contextual narrative text
- Use templates for consistency
- Balance automation with customization

### 5. **Performance**
- Clean up expired render instructions
- Lazy-load assets
- Reuse object instances
- Profile rendering performance

## Summary

The **StoryWorld System** provides a powerful abstraction for defining interactive, visual story experiences as object-oriented state machines. It complements the **Tool System** by handling presentation while tools handle data, creating a clean separation of concerns.

**Key Features:**
- ✅ Object-oriented state machines
- ✅ Visual/audio asset management
- ✅ Action-based state transitions
- ✅ Narrative rendering
- ✅ Side effects and cascading actions
- ✅ Public state exposure for AI
- ✅ Tool binding capability (future)

This system enables rich, interactive storytelling experiences where tools provide the logic and storyworlds provide the magic! ✨
