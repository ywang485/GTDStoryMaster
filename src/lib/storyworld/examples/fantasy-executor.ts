/**
 * Fantasy World Executor
 *
 * Implements all action handlers for the Fantasy storyworld.
 */

import type { ObjectInstance, ActionResult } from "@/types/storyworld-definition";
import { BaseStoryWorldExecutor } from "../base-storyworld-executor";
import { fantasyWorld } from "./fantasy-world";

export class FantasyWorldExecutor extends BaseStoryWorldExecutor {
  constructor() {
    super(fantasyWorld);

    this.objectAssets = {
      hero: {
        stateAssets: {
          idle: [
            { id: "hero-idle-sprite", type: "sprite", url: "/assets/fantasy/hero/idle.png", metadata: { dimensions: { width: 64, height: 64 } } },
            { id: "hero-idle-anim", type: "animation", url: "/assets/fantasy/hero/idle-anim.json", metadata: { duration: 2000, loop: true } },
          ],
          damaged: [
            { id: "hero-hurt-sprite", type: "sprite", url: "/assets/fantasy/hero/hurt.png", metadata: { dimensions: { width: 64, height: 64 } } },
          ],
        },
        actionAssets: {
          attack: [
            { id: "hero-attack", type: "animation", url: "/assets/fantasy/hero/attack.json", metadata: { duration: 600 } },
            { id: "sword-slash", type: "sound", url: "/assets/fantasy/sfx/sword-slash.mp3", metadata: { volume: 0.7 } },
            { id: "hit-spark", type: "particle", url: "/assets/fantasy/particles/hit-spark.json", metadata: { duration: 300 } },
          ],
          move: [
            { id: "hero-walk", type: "animation", url: "/assets/fantasy/hero/walk.json", metadata: { duration: 500, loop: true } },
            { id: "footsteps", type: "sound", url: "/assets/fantasy/sfx/footsteps.mp3", metadata: { volume: 0.5, loop: true } },
          ],
        },
      },
      monster: {
        stateAssets: {
          idle: [
            { id: "monster-idle", type: "sprite", url: "/assets/fantasy/monster/idle.png", metadata: { dimensions: { width: 64, height: 64 } } },
          ],
        },
        actionAssets: {
          take_damage: [
            { id: "monster-hurt", type: "animation", url: "/assets/fantasy/monster/hurt.json", metadata: { duration: 400 } },
            { id: "monster-pain", type: "sound", url: "/assets/fantasy/sfx/monster-pain.mp3", metadata: { volume: 0.6 } },
            { id: "blood-splatter", type: "particle", url: "/assets/fantasy/particles/blood.json", metadata: { duration: 500 } },
            { id: "monster-death", type: "animation", url: "/assets/fantasy/monster/death.json", metadata: { duration: 1000 } },
            { id: "monster-death-sound", type: "sound", url: "/assets/fantasy/sfx/monster-death.mp3", metadata: { volume: 0.7 } },
          ],
        },
      },
    };

    this.globalAssets = {
      defaultAssets: [
        { id: "background-music", type: "music", url: "/assets/fantasy/music/adventure-theme.mp3", metadata: { loop: true, volume: 0.3 } },
        { id: "ambient-forest", type: "sound", url: "/assets/fantasy/ambient/forest.mp3", metadata: { loop: true, volume: 0.2 } },
      ],
    };
  }

  protected async handleMove(
    instance: ObjectInstance,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    instance.state.position = { x: params.x, y: params.y };

    this.renderer.playAnimation("hero-walk", { duration: 500 });
    this.renderer.playSound("footsteps");
    this.renderer.displayText(
      `The hero moves to (${params.x}, ${params.y})`,
      { waitForClick: true },
    );

    return { success: true };
  }

  protected async handleAttack(
    instance: ObjectInstance,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    if (instance.state.health <= 0) {
      return { success: false, error: "Hero is dead" };
    }

    const damage = params.damage ?? 10;

    this.renderer.playSound("battle-cry");
    this.renderer.playAnimation("hero-attack", { duration: 600 });
    this.renderer.playSound("sword-slash");
    this.renderer.showParticle("hit-spark", { duration: 300 });
    this.renderer.showSprite("attack-complete");

    // Deal damage to target via side effect
    const targetId = params.targetId;
    const target = this.getObject(targetId);
    if (target) {
      await this.executeAction(targetId, "take_damage", { amount: damage });
    }

    this.renderer.displayText(
      `The hero attacks ${params.targetId} for ${damage} damage!`,
      { waitForClick: true },
    );

    return { success: true };
  }

  protected async handleUse_item(
    instance: ObjectInstance,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    if (instance.state.health <= 0) {
      return { success: false, error: "Hero is dead" };
    }

    const hasItem = instance.state.inventory.includes(params.itemId);
    if (!hasItem) {
      this.renderer.displayText(
        `You don't have ${params.itemId}!`,
        { waitForClick: true },
      );
      return { success: true };
    }

    if (params.itemId === "health-potion") {
      instance.state.health = Math.min(100, instance.state.health + 30);
      instance.state.inventory = instance.state.inventory.filter(
        (i: string) => i !== params.itemId,
      );

      this.renderer.playAnimation("drink-potion", { duration: 800 });
      this.renderer.playSound("potion-gulp");
      this.renderer.showParticle("heal-sparkle", { duration: 1000 });
      this.renderer.displayText(
        "The hero drinks the health potion and recovers 30 HP!",
        { waitForClick: true },
      );
    } else {
      this.renderer.displayText(
        `Used ${params.itemId}`,
        { waitForClick: true },
      );
    }

    return { success: true };
  }

  protected async handleTake_damage(
    instance: ObjectInstance,
    params: Record<string, any>,
  ): Promise<ActionResult> {
    const newHealth = instance.state.health - params.amount;
    instance.state.health = Math.max(0, newHealth);
    const isDead = instance.state.health <= 0;

    this.renderer.playAnimation("monster-hurt", { duration: 400 });
    this.renderer.playSound("monster-pain");
    this.renderer.showParticle("blood-splatter", { duration: 500 });

    if (isDead) {
      this.renderer.playAnimation("monster-death", { duration: 1000 });
      this.renderer.playSound("monster-death-sound");
      this.renderer.displayText(
        `The monster takes ${params.amount} damage and dies!`,
        { waitForClick: true },
      );
    } else {
      this.renderer.displayText(
        `The monster takes ${params.amount} damage! (${instance.state.health} HP remaining)`,
        { waitForClick: true },
      );
    }

    return { success: true };
  }
}
