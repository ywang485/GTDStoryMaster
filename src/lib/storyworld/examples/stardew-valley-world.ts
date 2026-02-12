/**
 * Stardew Valley Themed StoryWorld (Definition Only)
 *
 * Schema-only definition — all action logic lives in StardewValleyExecutor.
 *
 * A farming-themed storyworld with:
 * - Crops (water, grow, harvest)
 * - Village Facilities (shop, interact, upgrade)
 * - Villagers (relationship, dialogue, gifts)
 * - Livestock (feed, pet, collect produce)
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
        {
          name: "wilted",
          type: "boolean",
          description: "Crop has wilted from lack of water",
          default: false,
        },
      ],
      actions: [
        { id: "water", name: "Water", description: "Water the crop" },
        { id: "grow", name: "Grow", description: "Advance growth stage (called daily)" },
        { id: "harvest", name: "Harvest", description: "Harvest the mature crop" },
        { id: "fertilize", name: "Fertilize", description: "Apply fertilizer to boost growth" },
        { id: "wilt", name: "Wilt", description: "Crop wilts from lack of water (called daily if not watered)" },
        { id: "revive", name: "Revive", description: "Revive a wilted crop by watering it" },
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
          wilted: [
            { id: "wilted", type: "sprite", url: "/assets/farm/crops/crops.png", tileIndex: 13, tileSize: 16, tilesPerRow: 6, scale: 4.0 },
          ],
        },
        actionAssets: {
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
          wilt: [
            { id: "crop-wilt", type: "animation", url: "/assets/farm/actions/wilt.json", metadata: { duration: 1000 } },
            { id: "wilt-sound", type: "sound", url: "/assets/farm/sfx/wilt.mp3", metadata: { volume: 0.4 } },
            { id: "dry-dust", type: "particle", url: "/assets/farm/particles/dry.json" },
          ],
          revive: [
            { id: "crop-revive", type: "animation", url: "/assets/farm/actions/revive.json", metadata: { duration: 1500 } },
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
            { name: "currentHour", type: "number", description: "Current hour of day", required: true },
          ],
        },
        {
          id: "purchase",
          name: "Purchase",
          description: "Buy an item",
          parameters: [
            { name: "item", type: "string", description: "Item to purchase", required: true },
            { name: "quantity", type: "number", description: "Quantity to buy", default: 1 },
          ],
        },
        {
          id: "upgrade",
          name: "Upgrade",
          description: "Upgrade the facility",
          parameters: [
            { name: "cost", type: "number", description: "Cost of upgrade", required: true },
          ],
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
        { id: "talk", name: "Talk", description: "Have a conversation" },
        {
          id: "give_gift",
          name: "Give Gift",
          description: "Give an item as a gift",
          parameters: [
            { name: "item", type: "string", description: "Item to gift", required: true },
          ],
        },
        {
          id: "invite",
          name: "Invite",
          description: "Invite to an event",
          parameters: [
            { name: "event", type: "string", description: "Event name", required: true },
          ],
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
        { id: "feed", name: "Feed", description: "Feed the animal" },
        { id: "pet", name: "Pet", description: "Pet the animal" },
        { id: "collect_produce", name: "Collect Produce", description: "Collect eggs, milk, wool, etc." },
        { id: "produce", name: "Produce", description: "Generate produce (called daily)" },
        { id: "move_to_barn", name: "Move to Barn", description: "Move the animal to the barn" },
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
      { name: "season", type: "string", description: "Current season", default: "spring" },
      { name: "day", type: "number", description: "Day of the season (1-28)", default: 1, validation: { min: 1, max: 28 } },
      { name: "hour", type: "number", description: "Hour of the day (6-26)", default: 6, validation: { min: 6, max: 26 } },
      { name: "weather", type: "string", description: "Current weather", default: "sunny" },
      { name: "farmLevel", type: "number", description: "Overall farm level", default: 1 },
      { name: "gold", type: "number", description: "Player's gold", default: 500 },
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
