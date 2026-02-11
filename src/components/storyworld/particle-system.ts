/**
 * Particle System
 *
 * Renders particle effects on canvas (sparkles, hearts, water droplets, etc.)
 */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type: string;
  rotation?: number;
  rotationSpeed?: number;
}

export class ParticleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private animationFrame: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.startAnimation();
  }

  /**
   * Emit particles
   */
  emit(
    particleType: string,
    position: { x: number; y: number },
    duration: number
  ): void {
    const emitters: Record<string, () => void> = {
      "dirt-spray": () => this.emitDirtSpray(position),
      "water-droplets": () => this.emitWaterDroplets(position),
      "collect-sparkle": () => this.emitSparkle(position),
      "love-hearts": () => this.emitHearts(position),
      "feed-sparkle": () => this.emitSparkle(position, "#90EE90"),
      "nutrient-glow": () => this.emitGlow(position),
      "coin-sparkle": () => this.emitCoins(position),
      "construction-dust": () => this.emitDust(position),
      "hit-spark": () => this.emitSparks(position),
      "blood-splatter": () => this.emitSplatter(position),
      "heal-sparkle": () => this.emitSparkle(position, "#FFD700"),
      "excitement-sparkle": () => this.emitSparkle(position, "#FF69B4"),
      "produce-ready": () => this.emitReady(position),
    };

    const emitter = emitters[particleType];
    if (emitter) {
      emitter();
    } else {
      console.log(`Particle type not implemented: ${particleType}`);
    }
  }

  /**
   * Clean up
   */
  cleanup(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
  }

  // ========================================
  // Animation Loop
  // ========================================

  private startAnimation(): void {
    const animate = () => {
      this.update();
      this.render();
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  private update(): void {
    const gravity = 0.2;

    this.particles = this.particles.filter((particle) => {
      // Update position
      particle.x += particle.vx;
      particle.y += particle.vy;
      particle.vy += gravity;

      // Update rotation
      if (particle.rotation !== undefined && particle.rotationSpeed !== undefined) {
        particle.rotation += particle.rotationSpeed;
      }

      // Update life
      particle.life--;

      return particle.life > 0;
    });
  }

  private render(): void {
    // Particles are rendered by the main renderer now
    // This method is kept for compatibility but doesn't clear canvas

    this.ctx.save();
    this.particles.forEach((particle) => {
      this.ctx.save();

      // Calculate alpha based on life
      const alpha = particle.life / particle.maxLife;
      this.ctx.globalAlpha = alpha;

      // Apply rotation if present
      if (particle.rotation !== undefined) {
        this.ctx.translate(particle.x, particle.y);
        this.ctx.rotate(particle.rotation);
        this.ctx.translate(-particle.x, -particle.y);
      }

      // Render based on type
      switch (particle.type) {
        case "circle":
          this.ctx.fillStyle = particle.color;
          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
          this.ctx.fill();
          break;

        case "star":
          this.renderStar(particle.x, particle.y, particle.size, particle.color);
          break;

        case "heart":
          this.renderHeart(particle.x, particle.y, particle.size, particle.color);
          break;

        case "square":
          this.ctx.fillStyle = particle.color;
          this.ctx.fillRect(
            particle.x - particle.size / 2,
            particle.y - particle.size / 2,
            particle.size,
            particle.size
          );
          break;
      }

      this.ctx.restore();
    });
    this.ctx.restore();
  }

  private renderStar(x: number, y: number, size: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();

    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;

      if (i === 0) {
        this.ctx.moveTo(px, py);
      } else {
        this.ctx.lineTo(px, py);
      }
    }

    this.ctx.closePath();
    this.ctx.fill();
  }

  private renderHeart(x: number, y: number, size: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.beginPath();

    // Heart shape
    this.ctx.moveTo(x, y + size / 4);
    this.ctx.bezierCurveTo(x, y, x - size / 2, y, x - size / 2, y + size / 4);
    this.ctx.bezierCurveTo(x - size / 2, y + size / 2, x, y + size, x, y + size);
    this.ctx.bezierCurveTo(x, y + size, x + size / 2, y + size / 2, x + size / 2, y + size / 4);
    this.ctx.bezierCurveTo(x + size / 2, y, x, y, x, y + size / 4);

    this.ctx.closePath();
    this.ctx.fill();
  }

  // ========================================
  // Particle Emitters
  // ========================================

  private emitDirtSpray(position: { x: number; y: number }): void {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI - Math.PI / 2; // Upward spray
      const speed = 2 + Math.random() * 3;

      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        size: 2 + Math.random() * 3,
        color: `rgb(${139 + Math.random() * 50}, ${90 + Math.random() * 30}, ${43 + Math.random() * 20})`,
        type: "circle",
      });
    }
  }

  private emitWaterDroplets(position: { x: number; y: number }): void {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;

      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        size: 2 + Math.random() * 2,
        color: `rgba(100, 149, 237, ${0.6 + Math.random() * 0.4})`,
        type: "circle",
      });
    }
  }

  private emitSparkle(position: { x: number; y: number }, baseColor = "#FFD700"): void {
    for (let i = 0; i < 12; i++) {
      const angle = (i * Math.PI * 2) / 12;
      const speed = 1 + Math.random();

      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 30 + Math.random() * 15,
        maxLife: 45,
        size: 3 + Math.random() * 2,
        color: baseColor,
        type: "star",
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0.1 + Math.random() * 0.1,
      });
    }
  }

  private emitHearts(position: { x: number; y: number }): void {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.random() - 0.5) * Math.PI / 2;
      const speed = 0.5 + Math.random();

      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: -2 - Math.random(),
        life: 60 + Math.random() * 30,
        maxLife: 90,
        size: 8 + Math.random() * 4,
        color: "#FF69B4",
        type: "heart",
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0.05,
      });
    }
  }

  private emitGlow(position: { x: number; y: number }): void {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random();

      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 50 + Math.random() * 30,
        maxLife: 80,
        size: 2 + Math.random() * 2,
        color: `rgba(144, 238, 144, ${0.5 + Math.random() * 0.5})`,
        type: "circle",
      });
    }
  }

  private emitCoins(position: { x: number; y: number }): void {
    for (let i = 0; i < 10; i++) {
      const angle = Math.random() * Math.PI - Math.PI / 2;
      const speed = 2 + Math.random() * 2;

      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        size: 4 + Math.random() * 2,
        color: "#FFD700",
        type: "circle",
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0.2,
      });
    }
  }

  private emitDust(position: { x: number; y: number }): void {
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;

      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        life: 60 + Math.random() * 40,
        maxLife: 100,
        size: 3 + Math.random() * 3,
        color: `rgba(169, 169, 169, ${0.3 + Math.random() * 0.3})`,
        type: "circle",
      });
    }
  }

  private emitSparks(position: { x: number; y: number }): void {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 3;

      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 20 + Math.random() * 15,
        maxLife: 35,
        size: 2 + Math.random() * 2,
        color: `rgb(255, ${100 + Math.random() * 100}, 0)`,
        type: "star",
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: 0.3,
      });
    }
  }

  private emitSplatter(position: { x: number; y: number }): void {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;

      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 30 + Math.random() * 20,
        maxLife: 50,
        size: 2 + Math.random() * 3,
        color: `rgba(139, 0, 0, ${0.6 + Math.random() * 0.4})`,
        type: "circle",
      });
    }
  }

  private emitReady(position: { x: number; y: number }): void {
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const speed = 1;

      this.particles.push({
        x: position.x,
        y: position.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 40 + Math.random() * 20,
        maxLife: 60,
        size: 4 + Math.random() * 2,
        color: "#32CD32",
        type: "star",
        rotation: angle,
        rotationSpeed: 0.1,
      });
    }
  }
}
