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
        { id: "harvest", name: "Harvest", description: "Harvest the mature crop" },
        { id: "fertilize", name: "Fertilize", description: "Apply fertilizer to boost growth" },
        { id: "wilt", name: "Wilt", description: "Crop wilts from lack of water (called daily if not watered)" },
        { id: "mature", name: "Mature", description: "Instantly grow crop to maximum growth stage" },
      ],
      renderConfig: {
        layer: 1,
        priority: 50,
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
        }
      ],
      renderConfig: {
        layer: 3,
        priority: 70,
        persistent: true,
        interactable: true,
      },
    },
    // ========================================
    // BILLBOARD
    // ========================================
    {
      id: "billboard",
      name: "Billboard",
      description: "A wooden sign that displays public information",
      stateVariables: [
        {
          name: "content",
          type: "string",
          description: "HTML content displayed on the billboard",
          default: "",
        },
        {
          name: "position",
          type: "object",
          description: "2D position on the canvas",
          default: { x: 0, y: 0 },
        },
      ],
      actions: [
        {
          id: "update_content",
          name: "Update Content",
          description: "Update the HTML content shown on the billboard",
          parameters: [
            { name: "content", type: "string", description: "New HTML content", required: true },
          ],
        },
      ],
      renderConfig: {
        layer: 2,
        priority: 60,
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
        }
      ],
      actions: [
        { id: "feed", name: "Feed", description: "Feed the animal" },
        { id: "pet", name: "Pet", description: "Pet the animal" }
      ],
      renderConfig: {
        layer: 2,
        priority: 65,
        persistent: true,
        interactable: true,
      },
    },
  ],

  globalState: {
    variables: [
      { name: "weather", type: "string", description: "Current weather", default: "sunny" },
      { name: "gold", type: "number", description: "Player's gold", default: 500 },
    ],
    initialState: {
      weather: "sunny",
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
