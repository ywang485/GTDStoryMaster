/**
 * Stardew Valley Executor
 *
 * Implements all action handlers for the Stardew Valley storyworld.
 * Each action is a handler method that directly mutates state and
 * calls renderer methods for visual/audio feedback.
 */

import type { ObjectInstance, ActionResult } from "@/types/storyworld-definition";
import { BaseStoryWorldExecutor } from "../base-storyworld-executor";
import { stardewValleyWorld } from "./stardew-valley-world";

export class StardewValleyExecutor extends BaseStoryWorldExecutor {
  constructor() {
    super(stardewValleyWorld);
  }

  // ========================================
  // CROP ACTIONS
  // ========================================

  protected async handleWater(
    instance: ObjectInstance,
    _params: Record<string, any>,
  ): Promise<ActionResult> {
    if (instance.state.watered) {
      return { success: false, error: "Already watered today" };
    }
    if (instance.state.growthStage >= 4) {
      return { success: false, error: "Crop is already mature" };
    }

    instance.state.watered = true;
    instance.state.health = Math.min(100, instance.state.health + 5);

    this.renderer.playAnimation("watering-can", { duration: 1000 });
    this.renderer.playSound("water-splash");
    this.renderer.showParticle("water-droplets", { duration: 800 });
    this.renderer.displayText(
      `Water cascades from the watering can onto the ${instance.state.type}. The soil darkens as it drinks in the moisture.`,
      { waitForClick: true },
    );

    return { success: true };
  }

  protected async handleGrow(
    instance: ObjectInstance,
    _params: Record<string, any>,
  ): Promise<ActionResult> {
    if (!instance.state.watered) {
      return { success: false, error: "Crop needs water to grow" };
    }
    if (instance.state.growthStage >= 4) {
      return { success: false, error: "Crop is already mature" };
    }
    if (instance.state.wilted) {
      return { success: false, error: "Crop is wilted and cannot grow" };
    }

    instance.state.growthStage += 1;
    instance.state.watered = false;
    const isHarvestable = instance.state.growthStage >= 4;

    if (isHarvestable) {
      this.renderer.playAnimation("crop-mature", { duration: 1500 });
      this.renderer.playSound("growth-complete");
      this.renderer.showParticle("sparkle", { duration: 1000 });
      this.renderer.displayText(
        `The ${instance.state.type} has fully matured! Ripe and ready for harvest, it sways gently in the breeze.`,
        { waitForClick: true },
      );
    } else {
      this.renderer.playAnimation("crop-grow", { duration: 800 });
      this.renderer.displayText(
        `The ${instance.state.type} grows taller overnight. Stage ${instance.state.growthStage} of 4 complete.`,
        { waitForClick: true },
      );
    }

    return { success: true };
  }

  protected async handleHarvest(
    instance: ObjectInstance,
    _params: Record<string, any>,
  ): Promise<ActionResult> {
    if (instance.state.growthStage < 4) {
      return { success: false, error: "Crop is not mature enough to harvest" };
    }

    const quality =
      instance.state.health > 90
        ? "gold star"
        : instance.state.health > 70
          ? "silver star"
          : "regular";
    const quantity = instance.state.fertilized ? 3 : 2;

    instance.state.growthStage = 0;
    instance.state.health = 0;

    this.renderer.playAnimation("harvest-crop", { duration: 1200 });
    this.renderer.playSound("harvest-sound");
    this.renderer.showParticle("collect-sparkle", { duration: 1000 });
    this.renderer.displayText(
      `You harvest ${quantity} ${quality} ${instance.state.type}! The fresh produce goes straight into your basket.`,
      { waitForClick: true },
    );

    return { success: true };
  }

  protected async handleFertilize(
    instance: ObjectInstance,
    _params: Record<string, any>,
  ): Promise<ActionResult> {
    if (instance.state.fertilized) {
      return { success: false, error: "Already fertilized" };
    }
    if (instance.state.growthStage >= 4) {
      return { success: false, error: "Crop is already mature" };
    }

    instance.state.fertilized = true;
    instance.state.health = Math.min(100, instance.state.health + 10);

    this.renderer.playAnimation("apply-fertilizer", { duration: 800 });
    this.renderer.playSound("fertilizer-sound");
    this.renderer.showParticle("nutrient-glow", { duration: 1200 });
    this.renderer.displayText(
      "You carefully apply fertilizer around the plant. It'll grow stronger and produce higher quality crops!",
      { waitForClick: true },
    );

    return { success: true };
  }

  protected async handleWilt(
    instance: ObjectInstance,
    _params: Record<string, any>,
  ): Promise<ActionResult> {
    if (instance.state.watered) {
      return { success: false, error: "Crop is watered" };
    }
    if (instance.state.wilted) {
      return { success: false, error: "Already wilted" };
    }
    if (instance.state.growthStage <= 0 || instance.state.growthStage >= 4) {
      return { success: false, error: "Only growing crops can wilt" };
    }

    instance.state.wilted = true;
    instance.state.health = Math.max(0, instance.state.health - 20);

    this.renderer.playAnimation("crop-wilt", { duration: 1000 });
    this.renderer.playSound("wilt-sound");
    this.renderer.showParticle("dry-dust", { duration: 800 });
    this.renderer.displayText(
      `The ${instance.state.type} droops and wilts from lack of water. Its leaves turn brown at the edges.`,
      { waitForClick: true },
    );

    return { success: true };
  }

  protected async handleRevive(
    instance: ObjectInstance,
    _params: Record<string, any>,
  ): Promise<ActionResult> {
    if (!instance.state.wilted) {
      return { success: false, error: "Crop is not wilted" };
    }

    instance.state.wilted = false;
    instance.state.watered = true;
    instance.state.health = Math.min(100, instance.state.health + 10);

    this.renderer.playAnimation("watering-can", { duration: 1000 });
    this.renderer.playSound("water-splash");
    this.renderer.showParticle("water-droplets", { duration: 800 });
    this.renderer.playAnimation("crop-revive", { duration: 1500 });
    this.renderer.displayText(
      `You water the wilted ${instance.state.type}. Slowly, it perks back up as the water revitalizes it!`,
      { waitForClick: true },
    );

    return { success: true };
  }

  // ========================================
  // FACILITY ACTIONS
  // ========================================

  protected async handleEnter(
    instance: ObjectInstance,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const isWithinHours =
      params.currentHour >= instance.state.openHours.start &&
      params.currentHour < instance.state.openHours.end;

    if (!isWithinHours) {
      this.renderer.playSound("door-locked");
      this.renderer.displayText(
        `The ${instance.state.type} is closed. It opens at ${instance.state.openHours.start}:00 and closes at ${instance.state.openHours.end}:00.`,
        { waitForClick: true },
      );
      return { success: true };
    }

    this.renderer.playAnimation("door-open", { duration: 600 });
    this.renderer.playSound("door-chime");
    this.renderer.playMusic(`${instance.state.type}-music`);

    const smellDesc =
      instance.state.type === "shop"
        ? "fresh produce and seeds"
        : instance.state.type === "blacksmith"
          ? "coal and hot metal"
          : "old books";

    this.renderer.displayText(
      `The door chimes as you enter the ${instance.state.type}. The familiar smell of ${smellDesc} fills the air.`,
      { waitForClick: true },
    );

    return { success: true };
  }

  protected async handlePurchase(
    instance: ObjectInstance,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const hasItem = instance.state.inventory.includes(params.item);
    if (!hasItem) {
      this.renderer.playSound("negative-sound");
      this.renderer.displayText(
        `Sorry, we don't have ${params.item} in stock right now.`,
        { waitForClick: true },
      );
      return { success: true };
    }

    const prices: Record<string, number> = {
      seeds: 20,
      fertilizer: 50,
      watering_can: 2000,
      tools: 5000,
    };
    const quantity = params.quantity ?? 1;
    const totalCost = (prices[params.item] || 100) * quantity;

    instance.state.reputation += 5;

    this.renderer.playAnimation("cash-register", { duration: 800 });
    this.renderer.playSound("ka-ching");
    this.renderer.showParticle("coin-sparkle", { duration: 600 });
    this.renderer.displayText(
      `You purchase ${quantity}x ${params.item} for ${totalCost}g. The shopkeeper smiles and carefully wraps your items.`,
      { waitForClick: true },
    );

    return { success: true };
  }

  protected async handleUpgrade(
    instance: ObjectInstance,
    _params: Record<string, any>,
  ): Promise<ActionResult> {
    if (instance.state.upgradeLevel >= 3) {
      return { success: false, error: "Facility is already at maximum level" };
    }

    instance.state.upgradeLevel += 1;

    this.renderer.playAnimation("construction", { duration: 3000 });
    this.renderer.playSound("hammer-sounds");
    this.renderer.showParticle("construction-dust", { duration: 2000 });
    this.renderer.playSound("upgrade-complete");
    this.renderer.displayText(
      `After days of construction, the ${instance.state.type} has been upgraded to level ${instance.state.upgradeLevel}! It now has more inventory and better services.`,
      { waitForClick: true },
    );

    return { success: true };
  }

  // ========================================
  // VILLAGER ACTIONS
  // ========================================

  protected async handleTalk(
    instance: ObjectInstance,
    _params: Record<string, any>,
  ): Promise<ActionResult> {
    const friendshipGain = instance.state.talkedToday ? 0 : 5;
    const dialogues: Record<number, string> = {
      0: `Hello! I don't think we've met before. I'm ${instance.state.name}.`,
      3: "Hey there! Nice to see you around the farm.",
      5: "You're really getting the hang of farming! I'm impressed.",
      7: "I consider you a good friend now. Thanks for always stopping by.",
      10: "You're the best friend I could ask for! Let's make this valley even better together!",
    };

    const dialogueKey =
      Math.floor(instance.state.friendshipLevel / 2) * 2;
    const dialogue = dialogues[dialogueKey] || dialogues[0];

    instance.state.friendshipLevel = Math.min(
      10,
      instance.state.friendshipLevel + friendshipGain,
    );
    instance.state.talkedToday = true;

    this.renderer.playAnimation("villager-talk", { duration: 2000 });
    this.renderer.showSprite(`${instance.state.name}-portrait`);
    this.renderer.playSound("dialogue-sound");
    this.renderer.displayText(
      `${instance.state.name}: "${dialogue}"`,
      { waitForClick: true },
    );

    return { success: true };
  }

  protected async handleGive_gift(
    instance: ObjectInstance,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const isLoved = instance.state.favoriteGifts.includes(params.item);
    const friendshipGain = isLoved ? 20 : 10;
    const reaction = isLoved
      ? "Oh wow! This is my favorite! Thank you so much!"
      : "Thanks! This is nice of you.";

    instance.state.friendshipLevel = Math.min(
      10,
      instance.state.friendshipLevel + friendshipGain,
    );
    instance.state.mood = isLoved ? "very_happy" : "happy";

    this.renderer.playAnimation("give-gift", { duration: 1500 });
    this.renderer.showSprite(
      `${instance.state.name}-${isLoved ? "excited" : "happy"}`,
    );
    this.renderer.playSound(isLoved ? "love-sound" : "gift-sound");
    if (isLoved) {
      this.renderer.showParticle("love-hearts", { duration: 2000 });
    }
    this.renderer.displayText(
      `You give ${params.item} to ${instance.state.name}. ${instance.state.name}: "${reaction}" ${isLoved ? "(+2 hearts)" : "(+1 heart)"}`,
      { waitForClick: true },
    );

    return { success: true };
  }

  protected async handleInvite(
    instance: ObjectInstance,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    if (instance.state.friendshipLevel < 4) {
      return {
        success: false,
        error: "Not enough friendship to invite",
      };
    }

    instance.state.mood = "excited";

    this.renderer.playAnimation("villager-excited", { duration: 1000 });
    this.renderer.playSound("acceptance-sound");
    this.renderer.showParticle("excitement-sparkle", { duration: 1500 });
    this.renderer.displayText(
      `${instance.state.name}: "I'd love to go to the ${params.event} with you! Thanks for inviting me!"`,
      { waitForClick: true },
    );

    return { success: true };
  }

  // ========================================
  // LIVESTOCK ACTIONS
  // ========================================

  protected async handleFeed(
    instance: ObjectInstance,
    _params: Record<string, any>,
  ): Promise<ActionResult> {
    if (instance.state.fed) {
      return { success: false, error: "Already fed today" };
    }

    instance.state.fed = true;
    instance.state.happiness = Math.min(100, instance.state.happiness + 10);
    instance.state.health = Math.min(100, instance.state.health + 5);

    this.renderer.playAnimation("animal-eat", { duration: 2000 });
    this.renderer.playSound("eating-sound");
    this.renderer.showParticle("feed-sparkle", { duration: 800 });

    const feedType = instance.state.type === "chicken" ? "wheat" : "hay";
    this.renderer.displayText(
      `You place fresh ${feedType} in ${instance.state.name}'s feeding trough. ${instance.state.name} happily munches away!`,
      { waitForClick: true },
    );

    return { success: true };
  }

  protected async handlePet(
    instance: ObjectInstance,
    _params: Record<string, any>,
  ): Promise<ActionResult> {
    if (instance.state.petted) {
      return { success: false, error: "Already petted today" };
    }

    instance.state.petted = true;
    instance.state.happiness = Math.min(100, instance.state.happiness + 15);

    const sounds: Record<string, string> = {
      chicken: "Bawk bawk!",
      cow: "Mooooo~",
      goat: "Baaaaa!",
      sheep: "Baaaaah~",
    };
    const sound = sounds[instance.state.type] || "Happy sounds!";

    this.renderer.playAnimation("animal-happy", { duration: 1500 });
    this.renderer.playSound("animal-content-sound");
    this.renderer.showParticle("love-hearts", { duration: 1200 });
    this.renderer.displayText(
      `You gently pet ${instance.state.name}. ${instance.state.name} nuzzles against your hand contentedly. "${sound}"`,
      { waitForClick: true },
    );

    return { success: true };
  }

  protected async handleCollect_produce(
    instance: ObjectInstance,
    _params: Record<string, any>,
  ): Promise<ActionResult> {
    if (!instance.state.produceReady) {
      return { success: false, error: "No produce ready to collect" };
    }

    const produceTypes: Record<string, string> = {
      chicken: "egg",
      cow: "milk",
      goat: "goat milk",
      sheep: "wool",
    };
    const produce = produceTypes[instance.state.type] || "produce";
    const qualityLabel =
      instance.state.produceQuality === "gold"
        ? "gold star"
        : instance.state.produceQuality === "silver"
          ? "silver star"
          : "regular";

    instance.state.produceReady = false;
    instance.state.produceQuality = "regular";

    this.renderer.playAnimation("collect-produce", { duration: 1000 });
    this.renderer.playSound("collect-sound");
    this.renderer.showParticle("collect-sparkle", { duration: 800 });
    this.renderer.displayText(
      `You collect a ${qualityLabel} ${produce} from ${instance.state.name}! ${instance.state.happiness > 80 ? "The high quality shows how happy and healthy they are!" : ""}`,
      { waitForClick: true },
    );

    return { success: true };
  }

  protected async handleProduce(
    instance: ObjectInstance,
    _params: Record<string, any>,
  ): Promise<ActionResult> {
    const quality =
      instance.state.happiness > 90
        ? "gold"
        : instance.state.happiness > 70
          ? "silver"
          : "regular";

    instance.state.produceReady = true;
    instance.state.produceQuality = quality;
    instance.state.fed = false;
    instance.state.petted = false;
    instance.state.age += 1;

    this.renderer.showParticle("produce-ready", { duration: 500 });
    this.renderer.displayText(
      `${instance.state.name} has produced fresh ${quality} quality goods overnight!`,
      { waitForClick: true },
    );

    return { success: true };
  }

  protected async handleMove_to_barn(
    instance: ObjectInstance,
    _params: Record<string, any>,
  ): Promise<ActionResult> {
    this.renderer.playAnimation("animal-walk", { duration: 1500 });
    this.renderer.playSound("footsteps");
    this.renderer.displayText(
      `${instance.state.name} slowly walks back to the warm barn for the night.`,
      { waitForClick: true },
    );

    return { success: true };
  }
}
