/**
 * Stardew Valley Themed StoryWorld
 *
 * A farming-themed storyworld with:
 * - Crops (plant, water, harvest)
 * - Village Facilities (shop, interact, upgrade)
 * - Villagers (relationship, dialogue, gifts)
 * - Livestock (feed, pet, collect produce)
 * - Sentence-by-sentence narrative rendering
 */

import type { StoryWorldDefinition } from "@/types/storyworld-definition";

export const stardewValleyWorld: StoryWorldDefinition = {
  id: "stardew-valley-world-v1",
  name: "Peaceful Valley Farm",
  description: "A cozy farming world inspired by Stardew Valley",
  version: "1.0.0",

  objectTypes: [
    // ========================================
    // CROPS
    // ========================================
    {
      id: "crop",
      name: "Crop",
      description: "A plant growing on the farm",
      stateVariables: [
        {
          name: "type",
          type: "string",
          description: "Type of crop (tomato, wheat, etc.)",
          default: "wheat",
        },
        {
          name: "growthStage",
          type: "number",
          description: "Current growth stage (0-4, where 4 is harvestable)",
          default: 0,
          validation: { min: 0, max: 4 },
        },
        {
          name: "watered",
          type: "boolean",
          description: "Has been watered today",
          default: false,
        },
        {
          name: "health",
          type: "number",
          description: "Crop health (0-100)",
          default: 100,
          validation: { min: 0, max: 100 },
        },
        {
          name: "season",
          type: "string",
          description: "Season the crop was planted in",
          default: "spring",
        },
        {
          name: "fertilized",
          type: "boolean",
          description: "Has fertilizer applied",
          default: false,
        },
        {
          name: "position",
          type: "object",
          description: "Position on the farm",
          default: { x: 0, y: 0 },
        },
      ],
      actions: [
        {
          id: "plant",
          name: "Plant",
          description: "Plant a seed",
          parameters: [
            {
              name: "cropType",
              type: "string",
              description: "Type of crop to plant",
              required: true,
            },
            {
              name: "season",
              type: "string",
              description: "Current season",
              required: true,
            },
          ],
          logic: {
            customLogic: (params) => ({
              stateChanges: [
                { variable: "type", operation: "set", value: params.cropType },
                { variable: "growthStage", operation: "set", value: 0 },
                { variable: "season", operation: "set", value: params.season },
                { variable: "health", operation: "set", value: 100 },
              ],
              renderInstructions: [
                {
                  type: "play_animation",
                  assetId: "plant-seed",
                  duration: 800,
                },
                {
                  type: "play_sound",
                  assetId: "dig-soil",
                },
                {
                  type: "show_particle",
                  assetId: "dirt-spray",
                  duration: 500,
                },
              ],
              narrativeText: `You plant ${params.cropType} seeds in the rich soil. The seeds nestle into the earth, ready to grow.`,
            }),
          },
        },
        {
          id: "water",
          name: "Water",
          description: "Water the crop",
          parameters: [],
          logic: {
            preconditions: [
              { variable: "watered", operator: "==", value: false },
              { variable: "growthStage", operator: "<", value: 4 },
            ],
            stateChanges: [
              { variable: "watered", operation: "set", value: true },
              { variable: "health", operation: "add", value: 5 },
            ],
            renderInstructions: [
              {
                type: "play_animation",
                assetId: "watering-can",
                duration: 1000,
              },
              {
                type: "play_sound",
                assetId: "water-splash",
              },
              {
                type: "show_particle",
                assetId: "water-droplets",
                duration: 800,
              },
            ],
            narrativeText: (params, state) =>
              `Water cascades from the watering can onto the ${state.type}. The soil darkens as it drinks in the moisture.`,
          },
        },
        {
          id: "grow",
          name: "Grow",
          description: "Advance growth stage (called daily)",
          parameters: [],
          logic: {
            preconditions: [
              { variable: "watered", operator: "==", value: true },
              { variable: "growthStage", operator: "<", value: 4 },
            ],
            customLogic: (params, state) => {
              const newStage = state.growthStage + 1;
              const isHarvestable = newStage >= 4;

              return {
                stateChanges: [
                  { variable: "growthStage", operation: "add", value: 1 },
                  { variable: "watered", operation: "set", value: false },
                ],
                renderInstructions: isHarvestable
                  ? [
                      {
                        type: "play_animation",
                        assetId: "crop-mature",
                        duration: 1500,
                      },
                      {
                        type: "play_sound",
                        assetId: "growth-complete",
                      },
                      {
                        type: "show_particle",
                        assetId: "sparkle",
                        duration: 1000,
                      },
                    ]
                  : [
                      {
                        type: "play_animation",
                        assetId: "crop-grow",
                        duration: 800,
                      },
                    ],
                narrativeText: isHarvestable
                  ? `The ${state.type} has fully matured! Ripe and ready for harvest, it sways gently in the breeze.`
                  : `The ${state.type} grows taller overnight. Stage ${newStage} of 4 complete.`,
              };
            },
          },
        },
        {
          id: "harvest",
          name: "Harvest",
          description: "Harvest the mature crop",
          parameters: [],
          logic: {
            preconditions: [
              { variable: "growthStage", operator: ">=", value: 4 },
            ],
            customLogic: (params, state) => {
              const quality = state.health > 90 ? "gold star" : state.health > 70 ? "silver star" : "regular";
              const quantity = state.fertilized ? 3 : 2;

              return {
                stateChanges: [
                  { variable: "growthStage", operation: "set", value: 0 },
                  { variable: "health", operation: "set", value: 0 },
                ],
                renderInstructions: [
                  {
                    type: "play_animation",
                    assetId: "harvest-crop",
                    duration: 1200,
                  },
                  {
                    type: "play_sound",
                    assetId: "harvest-sound",
                  },
                  {
                    type: "show_particle",
                    assetId: "collect-sparkle",
                    duration: 1000,
                  },
                ],
                narrativeText: `You harvest ${quantity} ${quality} ${state.type}! The fresh produce goes straight into your basket.`,
              };
            },
          },
        },
        {
          id: "fertilize",
          name: "Fertilize",
          description: "Apply fertilizer to boost growth",
          parameters: [],
          logic: {
            preconditions: [
              { variable: "fertilized", operator: "==", value: false },
              { variable: "growthStage", operator: "<", value: 4 },
            ],
            stateChanges: [
              { variable: "fertilized", operation: "set", value: true },
              { variable: "health", operation: "add", value: 10 },
            ],
            renderInstructions: [
              {
                type: "play_animation",
                assetId: "apply-fertilizer",
                duration: 800,
              },
              {
                type: "play_sound",
                assetId: "fertilizer-sound",
              },
              {
                type: "show_particle",
                assetId: "nutrient-glow",
                duration: 1200,
              },
            ],
            narrativeText: "You carefully apply fertilizer around the plant. It'll grow stronger and produce higher quality crops!",
          },
        },
      ],
      assets: {
        stateAssets: {
          stage0: [
            { id: "seeds", type: "sprite", url: "/assets/farm/crops/crops.png", tileIndex: 8, tileSize: 16, tilesPerRow: 6, scale: 2.0 },
          ],
          stage1: [
            { id: "sprout", type: "sprite", url: "/assets/farm/crops/crops.png", tileIndex: 9, tileSize: 16, tilesPerRow: 6, scale: 2.0 },
          ],
          stage2: [
            { id: "growing", type: "sprite", url: "/assets/farm/crops/crops.png", tileIndex: 10, tileSize: 16, tilesPerRow: 6, scale: 2.0 },
          ],
          stage3: [
            { id: "maturing", type: "sprite", url: "/assets/farm/crops/crops.png", tileIndex: 11, tileSize: 16, tilesPerRow: 6, scale: 2.0 },
          ],
          stage4: [
            { id: "mature", type: "sprite", url: "/assets/farm/crops/crops.png", tileIndex: 12, tileSize: 16, tilesPerRow: 16, scale: 2.0 },
          ],
        },
        actionAssets: {
          plant: [
            { id: "plant-seed", type: "animation", url: "/assets/farm/actions/plant.json", metadata: { duration: 800 } },
            { id: "dig-soil", type: "sound", url: "/assets/farm/sfx/dig.mp3", metadata: { volume: 0.6 } },
            { id: "dirt-spray", type: "particle", url: "/assets/farm/particles/dirt.json" },
          ],
          water: [
            { id: "watering-can", type: "animation", url: "/assets/farm/actions/water.json", metadata: { duration: 1000 } },
            { id: "water-splash", type: "sound", url: "/assets/farm/sfx/water.mp3", metadata: { volume: 0.5 } },
            { id: "water-droplets", type: "particle", url: "/assets/farm/particles/water.json" },
          ],
          harvest: [
            { id: "harvest-crop", type: "animation", url: "/assets/farm/actions/harvest.json", metadata: { duration: 1200 } },
            { id: "harvest-sound", type: "sound", url: "/assets/farm/sfx/harvest.mp3", metadata: { volume: 0.7 } },
            { id: "collect-sparkle", type: "particle", url: "/assets/farm/particles/collect.json" },
          ],
        },
      },
      renderConfig: {
        layer: 1,
        priority: 50,
        interactable: true,
      },
    },

    // ========================================
    // VILLAGE FACILITIES
    // ========================================
    {
      id: "facility",
      name: "Village Facility",
      description: "A building or shop in the village",
      stateVariables: [
        {
          name: "type",
          type: "string",
          description: "Type of facility (shop, blacksmith, community_center)",
          default: "shop",
        },
        {
          name: "isOpen",
          type: "boolean",
          description: "Currently open for business",
          default: true,
        },
        {
          name: "openHours",
          type: "object",
          description: "Opening hours",
          default: { start: 9, end: 17 },
        },
        {
          name: "inventory",
          type: "array",
          description: "Items available for purchase",
          default: ["seeds", "fertilizer", "watering_can"],
        },
        {
          name: "upgradeLevel",
          type: "number",
          description: "Facility upgrade level",
          default: 1,
          validation: { min: 1, max: 3 },
        },
        {
          name: "reputation",
          type: "number",
          description: "Player's reputation with this facility",
          default: 0,
        },
      ],
      actions: [
        {
          id: "enter",
          name: "Enter",
          description: "Enter the facility",
          parameters: [
            {
              name: "currentHour",
              type: "number",
              description: "Current hour of day",
              required: true,
            },
          ],
          logic: {
            customLogic: (params, state) => {
              const isWithinHours = params.currentHour >= state.openHours.start && params.currentHour < state.openHours.end;

              if (!isWithinHours) {
                return {
                  narrativeText: `The ${state.type} is closed. It opens at ${state.openHours.start}:00 and closes at ${state.openHours.end}:00.`,
                  renderInstructions: [
                    { type: "play_sound", assetId: "door-locked" },
                  ],
                };
              }

              return {
                renderInstructions: [
                  { type: "play_animation", assetId: "door-open", duration: 600 },
                  { type: "play_sound", assetId: "door-chime" },
                  { type: "play_music", assetId: `${state.type}-music` },
                ],
                narrativeText: `The door chimes as you enter the ${state.type}. The familiar smell of ${state.type === "shop" ? "fresh produce and seeds" : state.type === "blacksmith" ? "coal and hot metal" : "old books"} fills the air.`,
              };
            },
          },
        },
        {
          id: "purchase",
          name: "Purchase",
          description: "Buy an item",
          parameters: [
            {
              name: "item",
              type: "string",
              description: "Item to purchase",
              required: true,
            },
            {
              name: "quantity",
              type: "number",
              description: "Quantity to buy",
              default: 1,
            },
          ],
          logic: {
            customLogic: (params, state) => {
              const hasItem = state.inventory.includes(params.item);

              if (!hasItem) {
                return {
                  narrativeText: `Sorry, we don't have ${params.item} in stock right now.`,
                  renderInstructions: [
                    { type: "play_sound", assetId: "negative-sound" },
                  ],
                };
              }

              const prices: Record<string, number> = {
                seeds: 20,
                fertilizer: 50,
                watering_can: 2000,
                tools: 5000,
              };

              const totalCost = (prices[params.item] || 100) * params.quantity;

              return {
                stateChanges: [
                  { variable: "reputation", operation: "add", value: 5 },
                ],
                renderInstructions: [
                  { type: "play_animation", assetId: "cash-register", duration: 800 },
                  { type: "play_sound", assetId: "ka-ching" },
                  { type: "show_particle", assetId: "coin-sparkle", duration: 600 },
                ],
                narrativeText: `You purchase ${params.quantity}x ${params.item} for ${totalCost}g. The shopkeeper smiles and carefully wraps your items.`,
              };
            },
          },
        },
        {
          id: "upgrade",
          name: "Upgrade",
          description: "Upgrade the facility",
          parameters: [
            {
              name: "cost",
              type: "number",
              description: "Cost of upgrade",
              required: true,
            },
          ],
          logic: {
            preconditions: [
              { variable: "upgradeLevel", operator: "<", value: 3 },
            ],
            stateChanges: [
              { variable: "upgradeLevel", operation: "add", value: 1 },
            ],
            renderInstructions: [
              { type: "play_animation", assetId: "construction", duration: 3000 },
              { type: "play_sound", assetId: "hammer-sounds" },
              { type: "show_particle", assetId: "construction-dust", duration: 2000 },
              { type: "play_sound", assetId: "upgrade-complete" },
            ],
            customLogic: (params, state) => ({
              stateChanges: [
                { variable: "upgradeLevel", operation: "add", value: 1 },
              ],
              narrativeText: `After days of construction, the ${state.type} has been upgraded to level ${state.upgradeLevel + 1}! It now has more inventory and better services.`,
            }),
          },
        },
      ],
      assets: {
        stateAssets: {
          open: [
            { id: "facility-open", type: "sprite", url: "/assets/farm/facilities/shop-open.png" },
          ],
          closed: [
            { id: "facility-closed", type: "sprite", url: "/assets/farm/facilities/shop-closed.png" },
          ],
        },
        actionAssets: {
          enter: [
            { id: "door-open", type: "animation", url: "/assets/farm/facilities/door-open.json" },
            { id: "door-chime", type: "sound", url: "/assets/farm/sfx/door-chime.mp3", metadata: { volume: 0.6 } },
          ],
          purchase: [
            { id: "cash-register", type: "animation", url: "/assets/farm/facilities/register.json" },
            { id: "ka-ching", type: "sound", url: "/assets/farm/sfx/cash-register.mp3", metadata: { volume: 0.7 } },
          ],
        },
      },
      renderConfig: {
        layer: 2,
        priority: 60,
        persistent: true,
        interactable: true,
      },
    },

    // ========================================
    // VILLAGERS
    // ========================================
    {
      id: "villager",
      name: "Villager",
      description: "A resident of the village",
      stateVariables: [
        {
          name: "name",
          type: "string",
          description: "Villager's name",
          default: "Alex",
        },
        {
          name: "friendshipLevel",
          type: "number",
          description: "Friendship hearts (0-10)",
          default: 0,
          validation: { min: 0, max: 10 },
        },
        {
          name: "location",
          type: "string",
          description: "Current location",
          default: "village_square",
        },
        {
          name: "mood",
          type: "string",
          description: "Current mood",
          default: "neutral",
        },
        {
          name: "schedule",
          type: "object",
          description: "Daily schedule",
          default: { morning: "home", afternoon: "shop", evening: "tavern" },
        },
        {
          name: "favoriteGifts",
          type: "array",
          description: "Loved gifts",
          default: ["sunflower", "pizza", "diamonds"],
        },
        {
          name: "talkedToday",
          type: "boolean",
          description: "Has been talked to today",
          default: false,
        },
        {
          name: "personality",
          type: "string",
          description: "Personality type",
          default: "friendly",
        },
      ],
      actions: [
        {
          id: "talk",
          name: "Talk",
          description: "Have a conversation",
          parameters: [],
          logic: {
            customLogic: (params, state) => {
              const friendshipGain = state.talkedToday ? 0 : 5;
              const dialogues = {
                0: "Hello! I don't think we've met before. I'm ${name}.",
                3: "Hey there! Nice to see you around the farm.",
                5: "You're really getting the hang of farming! I'm impressed.",
                7: "I consider you a good friend now. Thanks for always stopping by.",
                10: "You're the best friend I could ask for! Let's make this valley even better together!",
              };

              const dialogueKey = Math.floor(state.friendshipLevel / 2) * 2;
              const dialogue = dialogues[dialogueKey as keyof typeof dialogues] || dialogues[0];

              return {
                stateChanges: [
                  { variable: "friendshipLevel", operation: "add", value: friendshipGain },
                  { variable: "talkedToday", operation: "set", value: true },
                ],
                renderInstructions: [
                  { type: "play_animation", assetId: "villager-talk", duration: 2000 },
                  { type: "show_sprite", assetId: `${state.name}-portrait` },
                  { type: "play_sound", assetId: "dialogue-sound" },
                ],
                narrativeText: `${state.name}: "${dialogue.replace('${name}', state.name)}"`,
              };
            },
          },
        },
        {
          id: "give_gift",
          name: "Give Gift",
          description: "Give an item as a gift",
          parameters: [
            {
              name: "item",
              type: "string",
              description: "Item to gift",
              required: true,
            },
          ],
          logic: {
            customLogic: (params, state) => {
              const isLoved = state.favoriteGifts.includes(params.item);
              const friendshipGain = isLoved ? 20 : 10;
              const reaction = isLoved
                ? "Oh wow! This is my favorite! Thank you so much!"
                : "Thanks! This is nice of you.";

              return {
                stateChanges: [
                  { variable: "friendshipLevel", operation: "add", value: friendshipGain },
                  { variable: "mood", operation: "set", value: isLoved ? "very_happy" : "happy" },
                ],
                renderInstructions: [
                  { type: "play_animation", assetId: "give-gift", duration: 1500 },
                  { type: "show_sprite", assetId: `${state.name}-${isLoved ? 'excited' : 'happy'}` },
                  { type: "play_sound", assetId: isLoved ? "love-sound" : "gift-sound" },
                  ...(isLoved ? [{
                    type: "show_particle" as const,
                    assetId: "love-hearts",
                    duration: 2000,
                  }] : []),
                ],
                narrativeText: `You give ${params.item} to ${state.name}. ${state.name}: "${reaction}" ${isLoved ? '(+2 hearts)' : '(+1 heart)'}`,
              };
            },
          },
        },
        {
          id: "invite",
          name: "Invite",
          description: "Invite to an event",
          parameters: [
            {
              name: "event",
              type: "string",
              description: "Event name",
              required: true,
            },
          ],
          logic: {
            preconditions: [
              { variable: "friendshipLevel", operator: ">=", value: 4 },
            ],
            customLogic: (params, state) => ({
              stateChanges: [
                { variable: "mood", operation: "set", value: "excited" },
              ],
              renderInstructions: [
                { type: "play_animation", assetId: "villager-excited", duration: 1000 },
                { type: "play_sound", assetId: "acceptance-sound" },
                { type: "show_particle", assetId: "excitement-sparkle", duration: 1500 },
              ],
              narrativeText: `${state.name}: "I'd love to go to the ${params.event} with you! Thanks for inviting me!"`,
            }),
          },
        },
      ],
      assets: {
        stateAssets: {
          happy: [
            { id: "villager-happy", type: "sprite", url: "/assets/farm/villagers/happy.png" },
          ],
          neutral: [
            { id: "villager-neutral", type: "sprite", url: "/assets/farm/villagers/neutral.png" },
          ],
          sad: [
            { id: "villager-sad", type: "sprite", url: "/assets/farm/villagers/sad.png" },
          ],
        },
        actionAssets: {
          talk: [
            { id: "villager-talk", type: "animation", url: "/assets/farm/villagers/talk.json" },
            { id: "dialogue-sound", type: "sound", url: "/assets/farm/sfx/dialogue.mp3", metadata: { volume: 0.5 } },
          ],
          give_gift: [
            { id: "give-gift", type: "animation", url: "/assets/farm/villagers/gift.json" },
            { id: "gift-sound", type: "sound", url: "/assets/farm/sfx/gift.mp3", metadata: { volume: 0.6 } },
            { id: "love-sound", type: "sound", url: "/assets/farm/sfx/love.mp3", metadata: { volume: 0.7 } },
            { id: "love-hearts", type: "particle", url: "/assets/farm/particles/hearts.json" },
          ],
        },
      },
      renderConfig: {
        layer: 3,
        priority: 70,
        persistent: true,
        interactable: true,
      },
    },

    // ========================================
    // LIVESTOCK
    // ========================================
    {
      id: "livestock",
      name: "Livestock",
      description: "Farm animals (cows, chickens, etc.)",
      stateVariables: [
        {
          name: "type",
          type: "string",
          description: "Animal type (chicken, cow, goat, sheep)",
          default: "chicken",
        },
        {
          name: "name",
          type: "string",
          description: "Animal's name",
          default: "Clucky",
        },
        {
          name: "happiness",
          type: "number",
          description: "Happiness level (0-100)",
          default: 50,
          validation: { min: 0, max: 100 },
        },
        {
          name: "health",
          type: "number",
          description: "Health level (0-100)",
          default: 100,
          validation: { min: 0, max: 100 },
        },
        {
          name: "fed",
          type: "boolean",
          description: "Has been fed today",
          default: false,
        },
        {
          name: "petted",
          type: "boolean",
          description: "Has been petted today",
          default: false,
        },
        {
          name: "produceReady",
          type: "boolean",
          description: "Has produce ready to collect",
          default: false,
        },
        {
          name: "produceQuality",
          type: "string",
          description: "Quality of produce",
          default: "regular",
        },
        {
          name: "age",
          type: "number",
          description: "Age in days",
          default: 0,
        },
      ],
      actions: [
        {
          id: "feed",
          name: "Feed",
          description: "Feed the animal",
          parameters: [],
          logic: {
            preconditions: [
              { variable: "fed", operator: "==", value: false },
            ],
            stateChanges: [
              { variable: "fed", operation: "set", value: true },
              { variable: "happiness", operation: "add", value: 10 },
              { variable: "health", operation: "add", value: 5 },
            ],
            renderInstructions: [
              { type: "play_animation", assetId: "animal-eat", duration: 2000 },
              { type: "play_sound", assetId: "eating-sound" },
              { type: "show_particle", assetId: "feed-sparkle", duration: 800 },
            ],
            customLogic: (params, state) => ({
              stateChanges: [
                { variable: "fed", operation: "set", value: true },
                { variable: "happiness", operation: "add", value: 10 },
                { variable: "health", operation: "add", value: 5 },
              ],
              narrativeText: `You place fresh ${state.type === "chicken" ? "wheat" : "hay"} in ${state.name}'s feeding trough. ${state.name} happily munches away!`,
            }),
          },
        },
        {
          id: "pet",
          name: "Pet",
          description: "Pet the animal",
          parameters: [],
          logic: {
            preconditions: [
              { variable: "petted", operator: "==", value: false },
            ],
            stateChanges: [
              { variable: "petted", operation: "set", value: true },
              { variable: "happiness", operation: "add", value: 15 },
            ],
            renderInstructions: [
              { type: "play_animation", assetId: "animal-happy", duration: 1500 },
              { type: "play_sound", assetId: "animal-content-sound" },
              { type: "show_particle", assetId: "love-hearts", duration: 1200 },
            ],
            customLogic: (params, state) => {
              const sounds = {
                chicken: "Bawk bawk!",
                cow: "Mooooo~",
                goat: "Baaaaa!",
                sheep: "Baaaaah~",
              };
              const sound = sounds[state.type as keyof typeof sounds] || "Happy sounds!";

              return {
                stateChanges: [
                  { variable: "petted", operation: "set", value: true },
                  { variable: "happiness", operation: "add", value: 15 },
                ],
                narrativeText: `You gently pet ${state.name}. ${state.name} nuzzles against your hand contentedly. "${sound}"`,
              };
            },
          },
        },
        {
          id: "collect_produce",
          name: "Collect Produce",
          description: "Collect eggs, milk, wool, etc.",
          parameters: [],
          logic: {
            preconditions: [
              { variable: "produceReady", operator: "==", value: true },
            ],
            customLogic: (params, state) => {
              const produceTypes = {
                chicken: "egg",
                cow: "milk",
                goat: "goat milk",
                sheep: "wool",
              };
              const produce = produceTypes[state.type as keyof typeof produceTypes] || "produce";
              const qualityLabel = state.produceQuality === "gold" ? "⭐ gold star" : state.produceQuality === "silver" ? "silver star" : "regular";

              return {
                stateChanges: [
                  { variable: "produceReady", operation: "set", value: false },
                  { variable: "produceQuality", operation: "set", value: "regular" },
                ],
                renderInstructions: [
                  { type: "play_animation", assetId: "collect-produce", duration: 1000 },
                  { type: "play_sound", assetId: "collect-sound" },
                  { type: "show_particle", assetId: "collect-sparkle", duration: 800 },
                ],
                narrativeText: `You collect a ${qualityLabel} ${produce} from ${state.name}! ${state.happiness > 80 ? "The high quality shows how happy and healthy they are!" : ""}`,
              };
            },
          },
        },
        {
          id: "produce",
          name: "Produce",
          description: "Generate produce (called daily)",
          parameters: [],
          logic: {
            customLogic: (params, state) => {
              // High happiness = better quality produce
              const quality = state.happiness > 90 ? "gold" : state.happiness > 70 ? "silver" : "regular";

              return {
                stateChanges: [
                  { variable: "produceReady", operation: "set", value: true },
                  { variable: "produceQuality", operation: "set", value: quality },
                  { variable: "fed", operation: "set", value: false },
                  { variable: "petted", operation: "set", value: false },
                  { variable: "age", operation: "add", value: 1 },
                ],
                renderInstructions: [
                  { type: "show_particle", assetId: "produce-ready", duration: 500 },
                ],
                narrativeText: `${state.name} has produced fresh ${quality} quality goods overnight!`,
              };
            },
          },
        },
        {
          id: "move_to_barn",
          name: "Move to Barn",
          description: "Move the animal to the barn",
          parameters: [],
          logic: {
            renderInstructions: [
              { type: "play_animation", assetId: "animal-walk", duration: 1500 },
              { type: "play_sound", assetId: "footsteps" },
            ],
            narrativeText: (params, state) =>
              `${state.name} slowly walks back to the warm barn for the night.`,
          },
        },
      ],
      assets: {
        stateAssets: {
          happy: [
            { id: "animal-happy-sprite", type: "sprite", url: "/assets/farm/animals/happy.png" },
          ],
          neutral: [
            { id: "animal-neutral-sprite", type: "sprite", url: "/assets/farm/animals/neutral.png" },
          ],
          sick: [
            { id: "animal-sick-sprite", type: "sprite", url: "/assets/farm/animals/sick.png" },
          ],
        },
        actionAssets: {
          feed: [
            { id: "animal-eat", type: "animation", url: "/assets/farm/animals/eat.json" },
            { id: "eating-sound", type: "sound", url: "/assets/farm/sfx/eating.mp3", metadata: { volume: 0.5 } },
          ],
          pet: [
            { id: "animal-happy", type: "animation", url: "/assets/farm/animals/happy.json" },
            { id: "animal-content-sound", type: "sound", url: "/assets/farm/sfx/content.mp3", metadata: { volume: 0.6 } },
            { id: "love-hearts", type: "particle", url: "/assets/farm/particles/hearts.json" },
          ],
          collect_produce: [
            { id: "collect-produce", type: "animation", url: "/assets/farm/animals/collect.json" },
            { id: "collect-sound", type: "sound", url: "/assets/farm/sfx/collect.mp3", metadata: { volume: 0.7 } },
            { id: "collect-sparkle", type: "particle", url: "/assets/farm/particles/sparkle.json" },
          ],
        },
      },
      renderConfig: {
        layer: 2,
        priority: 65,
        persistent: true,
        interactable: true,
      },
    },
  ],

  // ========================================
  // NARRATIVE RENDERER (Sentence-by-Sentence)
  // ========================================
  narrativeRenderer: {
    action: {
      id: "render_narrative",
      name: "Render Narrative",
      description: "Display narrative text sentence by sentence with click-to-advance",
      parameters: [
        {
          name: "text",
          type: "string",
          description: "Narrative text to display",
          required: true,
        },
      ],
      logic: {
        customLogic: (params) => {
          // Split text into sentences
          const sentences = params.text
            .split(/(?<=[.!?])\s+/)
            .filter((s: string) => s.trim().length > 0);

          // Create render instructions for each sentence
          const renderInstructions = sentences.map((sentence: string, index: number) => ({
            type: "display_text" as const,
            text: sentence,
            style: {
              fontSize: 20,
              fontFamily: '"Stardew Valley", "Press Start 2P", monospace',
              color: "#331a00",
              backgroundColor: "#fffef7",
              padding: "20px",
              border: "4px solid #8b6f47",
              borderRadius: "8px",
              animation: "typewriter",
              speed: 40,
              waitForClick: true, // Wait for user click before advancing
              sentenceIndex: index,
              totalSentences: sentences.length,
            },
          }));

          return {
            renderInstructions,
            narrativeText: params.text,
          };
        },
      },
    },
    defaultStyle: {
      fontSize: 20,
      fontFamily: '"Stardew Valley", "Press Start 2P", monospace',
      color: "#331a00",
      backgroundColor: "#fffef7",
      animation: "typewriter",
      speed: 40,
    },
    template: (text) => {
      // Add flavor based on time/weather if available
      return text;
    },
  },

  // ========================================
  // GLOBAL ASSETS & STATE
  // ========================================
  globalAssets: {
    defaultAssets: [
      {
        id: "farm-bgm",
        type: "music",
        url: "/assets/farm/music/peaceful-valley.mp3",
        metadata: { loop: true, volume: 0.3 },
      },
      {
        id: "birds-chirping",
        type: "sound",
        url: "/assets/farm/ambient/birds.mp3",
        metadata: { loop: true, volume: 0.2 },
      },
      {
        id: "wind-rustling",
        type: "sound",
        url: "/assets/farm/ambient/wind.mp3",
        metadata: { loop: true, volume: 0.15 },
      },
    ],
  },

  globalState: {
    variables: [
      {
        name: "season",
        type: "string",
        description: "Current season",
        default: "spring",
      },
      {
        name: "day",
        type: "number",
        description: "Day of the season (1-28)",
        default: 1,
        validation: { min: 1, max: 28 },
      },
      {
        name: "hour",
        type: "number",
        description: "Hour of the day (6-26, where 26 is 2am)",
        default: 6,
        validation: { min: 6, max: 26 },
      },
      {
        name: "weather",
        type: "string",
        description: "Current weather",
        default: "sunny",
      },
      {
        name: "farmLevel",
        type: "number",
        description: "Overall farm level",
        default: 1,
      },
      {
        name: "gold",
        type: "number",
        description: "Player's gold",
        default: 500,
      },
    ],
    initialState: {
      season: "spring",
      day: 1,
      hour: 6,
      weather: "sunny",
      farmLevel: 1,
      gold: 500,
    },
  },

  metadata: {
    author: "StoryWorld Team",
    tags: ["farming", "relaxing", "simulation", "stardew-valley"],
    thumbnail: "/assets/farm/thumbnail.png",
    rating: "E",
  },
};
