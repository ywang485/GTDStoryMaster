/**
 * Sprite Renderer
 *
 * Renders sprites and animations for crops, animals, villagers, etc.
 * Uses simple geometric shapes and pixel art style.
 */

interface SpriteOptions {
  scale?: number;
  rotation?: number;
  opacity?: number;
}

interface AnimationFrame {
  draw: (ctx: CanvasRenderingContext2D, x: number, y: number) => void;
  duration: number;
}

export class SpriteRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private sprites: Map<string, (ctx: CanvasRenderingContext2D, x: number, y: number) => void> = new Map();
  private activeAnimations: Array<{
    id: string;
    frames: AnimationFrame[];
    currentFrame: number;
    position: { x: number; y: number };
    startTime: number;
    duration: number;
  }> = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.initializeSprites();
    this.startAnimation();
  }

  /**
   * Initialize sprite definitions
   */
  private initializeSprites(): void {
    // Crop sprites
    this.sprites.set("seeds", this.drawSeeds.bind(this));
    this.sprites.set("sprout", this.drawSprout.bind(this));
    this.sprites.set("growing", this.drawGrowing.bind(this));
    this.sprites.set("maturing", this.drawMaturing.bind(this));
    this.sprites.set("mature", this.drawMature.bind(this));

    // Animal sprites
    this.sprites.set("chicken", this.drawChicken.bind(this));
    this.sprites.set("cow", this.drawCow.bind(this));

    // Villager sprites
    this.sprites.set("villager", this.drawVillager.bind(this));

    // Facility sprites
    this.sprites.set("shop", this.drawShop.bind(this));
  }

  /**
   * Show a static sprite
   */
  showSprite(
    spriteId: string,
    position?: { x: number; y: number },
    options?: SpriteOptions
  ): void {
    const sprite = this.sprites.get(spriteId);
    if (!sprite) {
      console.log(`Sprite not found: ${spriteId}`);
      return;
    }

    const pos = position || { x: this.canvas.width / 2, y: this.canvas.height / 2 };

    this.ctx.save();
    this.ctx.globalAlpha = options?.opacity ?? 1;

    if (options?.rotation) {
      this.ctx.translate(pos.x, pos.y);
      this.ctx.rotate(options.rotation);
      this.ctx.translate(-pos.x, -pos.y);
    }

    if (options?.scale) {
      this.ctx.translate(pos.x, pos.y);
      this.ctx.scale(options.scale, options.scale);
      this.ctx.translate(-pos.x, -pos.y);
    }

    sprite(this.ctx, pos.x, pos.y);

    this.ctx.restore();
  }

  /**
   * Play an animation
   */
  playAnimation(
    animationId: string,
    position?: { x: number; y: number },
    duration = 1000
  ): void {
    const frames = this.getAnimationFrames(animationId);
    if (!frames || frames.length === 0) {
      console.log(`Animation not found: ${animationId}`);
      return;
    }

    const pos = position || { x: this.canvas.width / 2, y: this.canvas.height / 2 };

    this.activeAnimations.push({
      id: animationId,
      frames,
      currentFrame: 0,
      position: pos,
      startTime: Date.now(),
      duration,
    });
  }

  /**
   * Clean up
   */
  cleanup(): void {
    this.activeAnimations = [];
  }

  private startAnimation(): void {
    const animate = () => {
      this.renderAnimations();
      requestAnimationFrame(animate);
    };
    animate();
  }

  private renderAnimations(): void {
    const now = Date.now();

    this.activeAnimations = this.activeAnimations.filter((anim) => {
      const elapsed = now - anim.startTime;
      if (elapsed > anim.duration) {
        return false; // Remove completed animations
      }

      // Calculate current frame
      const progress = elapsed / anim.duration;
      const frameIndex = Math.floor(progress * anim.frames.length);
      const frame = anim.frames[Math.min(frameIndex, anim.frames.length - 1)];

      // Render frame
      frame.draw(this.ctx, anim.position.x, anim.position.y);

      return true;
    });
  }

  private getAnimationFrames(animationId: string): AnimationFrame[] {
    const animations: Record<string, AnimationFrame[]> = {
      "plant-seed": [
        { draw: (ctx, x, y) => this.drawPlantingAction(ctx, x, y, 0), duration: 200 },
        { draw: (ctx, x, y) => this.drawPlantingAction(ctx, x, y, 1), duration: 200 },
        { draw: (ctx, x, y) => this.drawPlantingAction(ctx, x, y, 2), duration: 200 },
        { draw: (ctx, x, y) => this.drawSeeds(ctx, x, y), duration: 200 },
      ],
      "watering-can": [
        { draw: (ctx, x, y) => this.drawWateringAction(ctx, x, y, 0), duration: 250 },
        { draw: (ctx, x, y) => this.drawWateringAction(ctx, x, y, 1), duration: 250 },
        { draw: (ctx, x, y) => this.drawWateringAction(ctx, x, y, 2), duration: 250 },
        { draw: (ctx, x, y) => this.drawWateringAction(ctx, x, y, 3), duration: 250 },
      ],
      "harvest-crop": [
        { draw: (ctx, x, y) => this.drawMature(ctx, x, y), duration: 300 },
        { draw: (ctx, x, y) => this.drawHarvestAction(ctx, x, y, 0), duration: 300 },
        { draw: (ctx, x, y) => this.drawHarvestAction(ctx, x, y, 1), duration: 300 },
        { draw: (ctx, x, y) => {}, duration: 300 }, // Empty (harvested)
      ],
      "crop-grow": [
        { draw: (ctx, x, y) => this.drawGrowthPulse(ctx, x, y, 0), duration: 200 },
        { draw: (ctx, x, y) => this.drawGrowthPulse(ctx, x, y, 1), duration: 200 },
        { draw: (ctx, x, y) => this.drawGrowthPulse(ctx, x, y, 2), duration: 200 },
        { draw: (ctx, x, y) => this.drawGrowthPulse(ctx, x, y, 1), duration: 200 },
      ],
      "animal-eat": [
        { draw: (ctx, x, y) => this.drawEatingAction(ctx, x, y, 0), duration: 500 },
        { draw: (ctx, x, y) => this.drawEatingAction(ctx, x, y, 1), duration: 500 },
        { draw: (ctx, x, y) => this.drawEatingAction(ctx, x, y, 0), duration: 500 },
        { draw: (ctx, x, y) => this.drawEatingAction(ctx, x, y, 1), duration: 500 },
      ],
      "villager-talk": [
        { draw: (ctx, x, y) => this.drawTalkingAction(ctx, x, y, 0), duration: 500 },
        { draw: (ctx, x, y) => this.drawTalkingAction(ctx, x, y, 1), duration: 500 },
        { draw: (ctx, x, y) => this.drawTalkingAction(ctx, x, y, 0), duration: 500 },
        { draw: (ctx, x, y) => this.drawTalkingAction(ctx, x, y, 1), duration: 500 },
      ],
    };

    return animations[animationId] || [];
  }

  // ========================================
  // Crop Sprites
  // ========================================

  private drawSeeds(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = "#8B4513";
    for (let i = 0; i < 3; i++) {
      const offsetX = (i - 1) * 4;
      ctx.fillRect(x + offsetX - 2, y - 2, 4, 4);
    }
  }

  private drawSprout(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = "#90EE90";
    ctx.fillRect(x - 3, y - 5, 6, 10);
    ctx.fillStyle = "#228B22";
    ctx.fillRect(x - 5, y - 8, 2, 6);
    ctx.fillRect(x + 3, y - 8, 2, 6);
  }

  private drawGrowing(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    ctx.fillStyle = "#228B22";
    ctx.fillRect(x - 2, y - 15, 4, 15);
    ctx.fillStyle = "#90EE90";
    for (let i = 0; i < 3; i++) {
      const offsetY = i * -5;
      ctx.fillRect(x - 6, y + offsetY - 10, 4, 4);
      ctx.fillRect(x + 2, y + offsetY - 10, 4, 4);
    }
  }

  private drawMaturing(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    this.drawGrowing(ctx, x, y);
    ctx.fillStyle = "#FFD700";
    ctx.beginPath();
    ctx.arc(x, y - 18, 4, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawMature(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    this.drawGrowing(ctx, x, y);
    ctx.fillStyle = "#FF6347";
    ctx.beginPath();
    ctx.arc(x, y - 18, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#228B22";
    ctx.fillRect(x - 1, y - 22, 2, 4);
  }

  // ========================================
  // Animal Sprites
  // ========================================

  private drawChicken(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Body
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x - 8, y - 10, 16, 12);

    // Head
    ctx.fillRect(x - 6, y - 16, 12, 8);

    // Beak
    ctx.fillStyle = "#FFA500";
    ctx.fillRect(x + 6, y - 12, 4, 3);

    // Eye
    ctx.fillStyle = "#000000";
    ctx.fillRect(x + 2, y - 14, 2, 2);

    // Legs
    ctx.fillStyle = "#FFA500";
    ctx.fillRect(x - 4, y + 2, 2, 6);
    ctx.fillRect(x + 2, y + 2, 2, 6);
  }

  private drawCow(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Body
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(x - 16, y - 12, 32, 16);

    // Head
    ctx.fillRect(x - 10, y - 20, 20, 12);

    // Spots
    ctx.fillStyle = "#000000";
    ctx.fillRect(x - 10, y - 8, 6, 6);
    ctx.fillRect(x + 4, y - 8, 6, 6);

    // Horns
    ctx.fillRect(x - 10, y - 24, 3, 4);
    ctx.fillRect(x + 7, y - 24, 3, 4);

    // Legs
    ctx.fillRect(x - 12, y + 4, 4, 10);
    ctx.fillRect(x - 4, y + 4, 4, 10);
    ctx.fillRect(x + 4, y + 4, 4, 10);
    ctx.fillRect(x + 12, y + 4, 4, 10);
  }

  // ========================================
  // Villager Sprites
  // ========================================

  private drawVillager(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Head
    ctx.fillStyle = "#FFD1A4";
    ctx.fillRect(x - 8, y - 24, 16, 16);

    // Hair
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(x - 8, y - 28, 16, 6);

    // Body
    ctx.fillStyle = "#4169E1";
    ctx.fillRect(x - 10, y - 8, 20, 16);

    // Arms
    ctx.fillStyle = "#FFD1A4";
    ctx.fillRect(x - 14, y - 6, 4, 10);
    ctx.fillRect(x + 10, y - 6, 4, 10);

    // Legs
    ctx.fillStyle = "#2F4F4F";
    ctx.fillRect(x - 8, y + 8, 6, 12);
    ctx.fillRect(x + 2, y + 8, 6, 12);
  }

  // ========================================
  // Facility Sprites
  // ========================================

  private drawShop(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    // Building
    ctx.fillStyle = "#CD853F";
    ctx.fillRect(x - 30, y - 40, 60, 50);

    // Roof
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.moveTo(x - 35, y - 40);
    ctx.lineTo(x, y - 55);
    ctx.lineTo(x + 35, y - 40);
    ctx.closePath();
    ctx.fill();

    // Door
    ctx.fillStyle = "#654321";
    ctx.fillRect(x - 8, y, 16, 10);

    // Windows
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(x - 20, y - 25, 10, 10);
    ctx.fillRect(x + 10, y - 25, 10, 10);
  }

  // ========================================
  // Animation Actions
  // ========================================

  private drawPlantingAction(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number): void {
    const offset = frame * 5;
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(x - 10 + offset, y - 10 - frame * 3, 4, 10 + frame * 2);
  }

  private drawWateringAction(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number): void {
    ctx.fillStyle = "#4682B4";
    for (let i = 0; i < frame * 3; i++) {
      const dropX = x - 10 + Math.random() * 20;
      const dropY = y - 15 + i * 3;
      ctx.fillRect(dropX, dropY, 2, 4);
    }
  }

  private drawHarvestAction(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number): void {
    ctx.save();
    ctx.globalAlpha = 1 - frame * 0.5;
    ctx.translate(x, y - 10 - frame * 5);
    this.drawMature(ctx, 0, 0);
    ctx.restore();
  }

  private drawGrowthPulse(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number): void {
    const scale = 1 + frame * 0.1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.translate(-x, -y);
    this.drawGrowing(ctx, x, y);
    ctx.restore();
  }

  private drawEatingAction(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number): void {
    this.drawChicken(ctx, x, y + (frame === 1 ? 2 : 0));

    // Food bowl
    ctx.fillStyle = "#FFD700";
    ctx.fillRect(x + 10, y + 5, 8, 4);
  }

  private drawTalkingAction(ctx: CanvasRenderingContext2D, x: number, y: number, frame: number): void {
    this.drawVillager(ctx, x, y);

    // Speech bubble
    if (frame === 1) {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(x + 12, y - 30, 24, 16);
      ctx.fillStyle = "#000000";
      ctx.font = "12px monospace";
      ctx.fillText("...", x + 18, y - 18);
    }
  }
}
