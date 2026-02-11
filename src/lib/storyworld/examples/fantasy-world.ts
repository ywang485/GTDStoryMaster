/**
 * Example: Fantasy StoryWorld Definition
 *
 * Demonstrates a complete storyworld with:
 * - Multiple object types (Hero, Monster, Item)
 * - State management (health, inventory, position)
 * - Actions (attack, move, use_item)
 * - Asset integration
 * - Narrative rendering
 */

import type { StoryWorldDefinition } from "@/types/storyworld-definition";

export const fantasyWorld: StoryWorldDefinition = {
  id: "fantasy-world-v1",
  name: "Fantasy Realm",
  description: "A magical fantasy world with heroes, monsters, and treasures",
  version: "1.0.0",

  // Define object types
  objectTypes: [
    {
      id: "hero",
      name: "Hero",
      description: "The player's character",
      stateVariables: [
        {
          name: "health",
          type: "number",
          description: "Current health points",
          default: 100,
          validation: { min: 0, max: 100 },
        },
        {
          name: "position",
          type: "object",
          description: "Current location",
          default: { x: 0, y: 0 },
        },
        {
          name: "inventory",
          type: "array",
          description: "Items carried",
          default: [],
        },
        {
          name: "level",
          type: "number",
          description: "Character level",
          default: 1,
          validation: { min: 1, max: 99 },
        },
        {
          name: "experience",
          type: "number",
          description: "Experience points",
          default: 0,
        },
      ],
      actions: [
        {
          id: "move",
          name: "Move",
          description: "Move to a new location",
          parameters: [
            {
              name: "x",
              type: "number",
              description: "Target X coordinate",
              required: true,
            },
            {
              name: "y",
              type: "number",
              description: "Target Y coordinate",
              required: true,
            },
          ],
          logic: {
            stateChanges: [
              {
                variable: "position",
                operation: "set",
                value: { x: 0, y: 0 }, // Will be replaced by params
              },
            ],
            renderInstructions: [
              {
                type: "play_animation",
                assetId: "hero-walk",
                duration: 500,
              },
              {
                type: "play_sound",
                assetId: "footsteps",
              },
            ],
            customLogic: (params, state) => ({
              stateChanges: [
                {
                  variable: "position",
                  operation: "set",
                  value: { x: params.x, y: params.y },
                },
              ],
              narrativeText: `The hero moves to (${params.x}, ${params.y})`,
            }),
          },
        },
        {
          id: "attack",
          name: "Attack",
          description: "Attack a target",
          parameters: [
            {
              name: "targetId",
              type: "string",
              description: "ID of the target object",
              required: true,
            },
            {
              name: "damage",
              type: "number",
              description: "Damage to deal",
              default: 10,
            },
          ],
          logic: {
            preconditions: [
              {
                variable: "health",
                operator: ">",
                value: 0,
              },
            ],
            renderInstructions: [
              {
                type: "play_animation",
                assetId: "hero-attack",
                duration: 600,
              },
              {
                type: "play_sound",
                assetId: "sword-slash",
              },
              {
                type: "show_particle",
                assetId: "hit-spark",
                duration: 300,
              },
            ],
            sideEffects: [
              {
                // Damage the target
                action: "take_damage",
                params: { amount: 10 },
              },
            ],
            narrativeText: (params) =>
              `The hero attacks ${params.targetId} for ${params.damage} damage!`,
          },
          onStart: [
            {
              type: "play_sound",
              assetId: "battle-cry",
            },
          ],
          onComplete: [
            {
              type: "show_sprite",
              assetId: "attack-complete",
              duration: 200,
            },
          ],
        },
        {
          id: "use_item",
          name: "Use Item",
          description: "Use an item from inventory",
          parameters: [
            {
              name: "itemId",
              type: "string",
              description: "ID of the item to use",
              required: true,
            },
          ],
          logic: {
            preconditions: [
              {
                variable: "health",
                operator: ">",
                value: 0,
              },
            ],
            customLogic: (params, state) => {
              const hasItem = state.inventory.includes(params.itemId);
              if (!hasItem) {
                return {
                  narrativeText: `You don't have ${params.itemId}!`,
                };
              }

              // Example: Health potion
              if (params.itemId === "health-potion") {
                return {
                  stateChanges: [
                    {
                      variable: "health",
                      operation: "add",
                      value: 30,
                    },
                    {
                      variable: "inventory",
                      operation: "remove",
                      value: params.itemId,
                    },
                  ],
                  renderInstructions: [
                    {
                      type: "play_animation",
                      assetId: "drink-potion",
                      duration: 800,
                    },
                    {
                      type: "play_sound",
                      assetId: "potion-gulp",
                    },
                    {
                      type: "show_particle",
                      assetId: "heal-sparkle",
                      duration: 1000,
                    },
                  ],
                  narrativeText: "The hero drinks the health potion and recovers 30 HP!",
                };
              }

              return {
                narrativeText: `Used ${params.itemId}`,
              };
            },
          },
        },
      ],
      assets: {
        stateAssets: {
          idle: [
            {
              id: "hero-idle-sprite",
              type: "sprite",
              url: "/assets/fantasy/hero/idle.png",
              metadata: { dimensions: { width: 64, height: 64 } },
            },
            {
              id: "hero-idle-anim",
              type: "animation",
              url: "/assets/fantasy/hero/idle-anim.json",
              metadata: { duration: 2000, loop: true },
            },
          ],
          damaged: [
            {
              id: "hero-hurt-sprite",
              type: "sprite",
              url: "/assets/fantasy/hero/hurt.png",
              metadata: { dimensions: { width: 64, height: 64 } },
            },
          ],
        },
        actionAssets: {
          attack: [
            {
              id: "hero-attack",
              type: "animation",
              url: "/assets/fantasy/hero/attack.json",
              metadata: { duration: 600 },
            },
            {
              id: "sword-slash",
              type: "sound",
              url: "/assets/fantasy/sfx/sword-slash.mp3",
              metadata: { volume: 0.7 },
            },
            {
              id: "hit-spark",
              type: "particle",
              url: "/assets/fantasy/particles/hit-spark.json",
              metadata: { duration: 300 },
            },
          ],
          move: [
            {
              id: "hero-walk",
              type: "animation",
              url: "/assets/fantasy/hero/walk.json",
              metadata: { duration: 500, loop: true },
            },
            {
              id: "footsteps",
              type: "sound",
              url: "/assets/fantasy/sfx/footsteps.mp3",
              metadata: { volume: 0.5, loop: true },
            },
          ],
        },
      },
      initialState: {
        health: 100,
        position: { x: 0, y: 0 },
        inventory: ["health-potion", "sword"],
        level: 1,
        experience: 0,
      },
      renderConfig: {
        layer: 2,
        priority: 100,
        persistent: true,
        interactable: true,
      },
    },
    {
      id: "monster",
      name: "Monster",
      description: "An enemy creature",
      stateVariables: [
        {
          name: "health",
          type: "number",
          description: "Current health points",
          default: 50,
          validation: { min: 0, max: 100 },
        },
        {
          name: "position",
          type: "object",
          description: "Current location",
          default: { x: 0, y: 0 },
        },
        {
          name: "aggroRange",
          type: "number",
          description: "Detection range",
          default: 5,
        },
        {
          name: "isHostile",
          type: "boolean",
          description: "Will attack on sight",
          default: true,
        },
      ],
      actions: [
        {
          id: "take_damage",
          name: "Take Damage",
          description: "Receive damage",
          parameters: [
            {
              name: "amount",
              type: "number",
              description: "Damage amount",
              required: true,
            },
          ],
          logic: {
            stateChanges: [
              {
                variable: "health",
                operation: "subtract",
                value: 0, // Will be replaced by params
              },
            ],
            renderInstructions: [
              {
                type: "play_animation",
                assetId: "monster-hurt",
                duration: 400,
              },
              {
                type: "play_sound",
                assetId: "monster-pain",
              },
              {
                type: "show_particle",
                assetId: "blood-splatter",
                duration: 500,
              },
            ],
            customLogic: (params, state) => {
              const newHealth = state.health - params.amount;
              const isDead = newHealth <= 0;

              return {
                stateChanges: [
                  {
                    variable: "health",
                    operation: "subtract",
                    value: params.amount,
                  },
                ],
                renderInstructions: isDead
                  ? [
                      {
                        type: "play_animation",
                        assetId: "monster-death",
                        duration: 1000,
                      },
                      {
                        type: "play_sound",
                        assetId: "monster-death-sound",
                      },
                    ]
                  : [],
                narrativeText: isDead
                  ? `The monster takes ${params.amount} damage and dies!`
                  : `The monster takes ${params.amount} damage! (${newHealth} HP remaining)`,
              };
            },
          },
        },
      ],
      assets: {
        stateAssets: {
          idle: [
            {
              id: "monster-idle",
              type: "sprite",
              url: "/assets/fantasy/monster/idle.png",
              metadata: { dimensions: { width: 64, height: 64 } },
            },
          ],
        },
        actionAssets: {
          take_damage: [
            {
              id: "monster-hurt",
              type: "animation",
              url: "/assets/fantasy/monster/hurt.json",
              metadata: { duration: 400 },
            },
            {
              id: "monster-pain",
              type: "sound",
              url: "/assets/fantasy/sfx/monster-pain.mp3",
              metadata: { volume: 0.6 },
            },
            {
              id: "blood-splatter",
              type: "particle",
              url: "/assets/fantasy/particles/blood.json",
              metadata: { duration: 500 },
            },
            {
              id: "monster-death",
              type: "animation",
              url: "/assets/fantasy/monster/death.json",
              metadata: { duration: 1000 },
            },
            {
              id: "monster-death-sound",
              type: "sound",
              url: "/assets/fantasy/sfx/monster-death.mp3",
              metadata: { volume: 0.7 },
            },
          ],
        },
      },
    },
  ],

  // Root-level narrative renderer
  narrativeRenderer: {
    action: {
      id: "render_narrative",
      name: "Render Narrative",
      description: "Display narrative text to the player",
      parameters: [
        {
          name: "text",
          type: "string",
          description: "Narrative text to display",
          required: true,
        },
      ],
      logic: {
        renderInstructions: [
          {
            type: "display_text",
            text: "",
          },
        ],
      },
    },
    defaultStyle: {
      fontSize: 18,
      fontFamily: "Georgia, serif",
      color: "#2c2c2c",
      animation: "typewriter",
      speed: 50,
    },
    template: (text, context) => {
      const timestamp = new Date().toLocaleTimeString();
      return `[${timestamp}] ${text}`;
    },
  },

  // Global assets
  globalAssets: {
    defaultAssets: [
      {
        id: "background-music",
        type: "music",
        url: "/assets/fantasy/music/adventure-theme.mp3",
        metadata: { loop: true, volume: 0.3 },
      },
      {
        id: "ambient-forest",
        type: "sound",
        url: "/assets/fantasy/ambient/forest.mp3",
        metadata: { loop: true, volume: 0.2 },
      },
    ],
  },

  // Global state
  globalState: {
    variables: [
      {
        name: "timeOfDay",
        type: "string",
        description: "Current time of day",
        default: "morning",
      },
      {
        name: "weather",
        type: "string",
        description: "Current weather",
        default: "clear",
      },
      {
        name: "questProgress",
        type: "number",
        description: "Main quest progress",
        default: 0,
      },
    ],
    initialState: {
      timeOfDay: "morning",
      weather: "clear",
      questProgress: 0,
    },
  },

  metadata: {
    author: "StoryWorld Team",
    tags: ["fantasy", "combat", "adventure"],
    thumbnail: "/assets/fantasy/thumbnail.png",
    rating: "E10+",
  },
};
