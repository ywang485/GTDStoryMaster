/**
 * StoryWorld Renderer Interface
 *
 * Imperative interface for visual/audio rendering that executors
 * call directly from action handlers. The React renderer component
 * implements this interface and is injected into the executor.
 */

export interface Position {
  x: number;
  y: number;
  z?: number;
}

export interface StoryWorldRendererInterface {
  /** Play a named animation */
  playAnimation(assetId: string, opts?: {
    duration?: number;
    position?: Position;
  }): void;

  /** Play a sound effect */
  playSound(assetId: string): void;

  /** Play background music */
  playMusic(assetId: string): void;

  /** Emit a particle effect */
  showParticle(assetId: string, opts?: {
    duration?: number;
    position?: Position;
  }): void;

  /** Show a sprite */
  showSprite(assetId: string, opts?: {
    scale?: number;
    rotation?: number;
    opacity?: number;
    position?: Position;
  }): void;

  /** Display narrative text to the player */
  displayText(text: string, opts?: {
    animation?: "typewriter" | "fade" | "slide" | "none";
    speed?: number;
    waitForClick?: boolean;
  }): void;

  /** Stream partial text into the current textbox (replaces content, no animation).
   *  If committed text is waiting for click, the new text is buffered until clicked. */
  streamText(text: string): void;

  /** Mark the current streamed text as complete, enabling click-to-advance.
   *  No-op if not currently streaming. */
  commitStreamedText(): void;
}
