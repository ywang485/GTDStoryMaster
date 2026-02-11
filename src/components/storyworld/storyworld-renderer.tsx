/**
 * StoryWorld Renderer Component
 *
 * Displays visual animations and plays sound effects for storyworld actions.
 * Uses CSS animations, Canvas for sprites, and Web Audio API for sounds.
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  RenderInstruction,
  StoryWorldState,
  StoryWorldExecutor
} from "@/types/storyworld-definition";
import { SoundEngine } from "./sound-engine";
import { ParticleSystem } from "./particle-system";
import { SpriteRenderer } from "./sprite-renderer";

interface StoryWorldRendererProps {
  executor: StoryWorldExecutor;
  width?: number;
  height?: number;
  onRenderComplete?: (instruction: RenderInstruction) => void;
  onNarrativeClick?: () => void;
}

export function StoryWorldRenderer({
  executor,
  width = 800,
  height = 600,
  onRenderComplete,
  onNarrativeClick,
}: StoryWorldRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const soundEngineRef = useRef<SoundEngine | null>(null);
  const particleSystemRef = useRef<ParticleSystem | null>(null);
  const spriteRendererRef = useRef<SpriteRenderer | null>(null);

  const [narrativeQueue, setNarrativeQueue] = useState<string[]>([]);
  const [currentNarrative, setCurrentNarrative] = useState<string>("");
  const [isTyping, setIsTyping] = useState(false);
  const [activeAnimations, setActiveAnimations] = useState<Set<string>>(new Set());

  // Initialize systems
  useEffect(() => {
    soundEngineRef.current = new SoundEngine();
    particleSystemRef.current = new ParticleSystem(canvasRef.current!);
    spriteRendererRef.current = new SpriteRenderer(canvasRef.current!);

    return () => {
      soundEngineRef.current?.cleanup();
      particleSystemRef.current?.cleanup();
      spriteRendererRef.current?.cleanup();
    };
  }, []);

  // Watch for state changes and render
  useEffect(() => {
    const state = executor.getState();

    // Render active instructions
    state.activeRenders.forEach((render) => {
      executeRenderInstruction(render.instruction);
    });

    // Clean up expired renders
    executor.cleanupExpiredRenders();
  }, [executor]);

  const executeRenderInstruction = useCallback(
    (instruction: RenderInstruction) => {
      const id = `${instruction.type}-${Date.now()}`;

      switch (instruction.type) {
        case "display_text":
          handleDisplayText(instruction);
          break;

        case "play_animation":
          handlePlayAnimation(instruction, id);
          break;

        case "show_sprite":
          handleShowSprite(instruction, id);
          break;

        case "play_sound":
          handlePlaySound(instruction);
          break;

        case "play_music":
          handlePlayMusic(instruction);
          break;

        case "show_particle":
          handleShowParticle(instruction, id);
          break;

        case "apply_shader":
          handleApplyShader(instruction, id);
          break;

        case "play_video":
          handlePlayVideo(instruction, id);
          break;
      }

      // Notify completion
      if (instruction.duration) {
        setTimeout(() => {
          setActiveAnimations((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          onRenderComplete?.(instruction);
        }, instruction.duration);
      }
    },
    [onRenderComplete]
  );

  const handleDisplayText = (instruction: RenderInstruction) => {
    if (!instruction.text) return;

    const style = instruction.style || {};

    // Check if this is sentence-by-sentence rendering
    if (style.waitForClick) {
      // Add to narrative queue
      setNarrativeQueue((prev) => [...prev, instruction.text!]);
    } else {
      // Show immediately
      setCurrentNarrative(instruction.text);

      if (style.animation === "typewriter") {
        typewriterEffect(instruction.text, style.speed || 50);
      }
    }
  };

  const typewriterEffect = (text: string, speed: number) => {
    setIsTyping(true);
    let index = 0;
    setCurrentNarrative("");

    const interval = setInterval(() => {
      if (index < text.length) {
        setCurrentNarrative((prev) => prev + text[index]);
        index++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
      }
    }, speed);
  };

  const handleNarrativeClick = () => {
    if (isTyping) {
      // Skip to end of current typing
      setIsTyping(false);
      return;
    }

    // Show next in queue
    if (narrativeQueue.length > 0) {
      const [next, ...rest] = narrativeQueue;
      setNarrativeQueue(rest);
      typewriterEffect(next, 40);
      onNarrativeClick?.();
    } else {
      setCurrentNarrative("");
    }
  };

  const handlePlayAnimation = (instruction: RenderInstruction, id: string) => {
    setActiveAnimations((prev) => new Set(prev).add(id));

    // Use sprite renderer to play animation
    if (instruction.assetId) {
      spriteRendererRef.current?.playAnimation(
        instruction.assetId,
        instruction.position,
        instruction.duration || 1000
      );
    }
  };

  const handleShowSprite = (instruction: RenderInstruction, id: string) => {
    setActiveAnimations((prev) => new Set(prev).add(id));

    if (instruction.assetId) {
      spriteRendererRef.current?.showSprite(
        instruction.assetId,
        instruction.position,
        {
          scale: instruction.scale,
          rotation: instruction.rotation,
          opacity: instruction.opacity,
        }
      );
    }
  };

  const handlePlaySound = (instruction: RenderInstruction) => {
    if (instruction.assetId) {
      soundEngineRef.current?.playSound(instruction.assetId);
    }
  };

  const handlePlayMusic = (instruction: RenderInstruction) => {
    if (instruction.assetId) {
      soundEngineRef.current?.playMusic(instruction.assetId);
    }
  };

  const handleShowParticle = (instruction: RenderInstruction, id: string) => {
    setActiveAnimations((prev) => new Set(prev).add(id));

    if (instruction.assetId) {
      particleSystemRef.current?.emit(
        instruction.assetId,
        instruction.position || { x: width / 2, y: height / 2 },
        instruction.duration || 1000
      );
    }
  };

  const handleApplyShader = (instruction: RenderInstruction, id: string) => {
    // Apply shader effect to canvas
    console.log("Shader effect:", instruction.assetId);
  };

  const handlePlayVideo = (instruction: RenderInstruction, id: string) => {
    // Play video in overlay
    console.log("Video:", instruction.assetId);
  };

  return (
    <div
      className="storyworld-renderer relative"
      style={{ width, height }}
    >
      {/* Canvas for sprites and particles */}
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="absolute inset-0"
      />

      {/* Narrative textbox */}
      {currentNarrative && (
        <div
          className="absolute bottom-4 left-4 right-4 cursor-pointer"
          onClick={handleNarrativeClick}
        >
          <div className="stardew-textbox">
            <p className="text-lg leading-relaxed">
              {currentNarrative}
            </p>
            {!isTyping && narrativeQueue.length === 0 && (
              <div className="text-right text-sm opacity-70 mt-2">
                (Click to close)
              </div>
            )}
            {!isTyping && narrativeQueue.length > 0 && (
              <div className="text-right text-sm opacity-70 mt-2">
                (Click to continue) {narrativeQueue.length} more
              </div>
            )}
          </div>
        </div>
      )}

      {/* Active animation indicators */}
      {Array.from(activeAnimations).map((id) => (
        <div key={id} className="animation-indicator" />
      ))}

      {/* CSS Styles */}
      <style jsx>{`
        .storyworld-renderer {
          background: linear-gradient(to bottom, #87CEEB 0%, #98D8C8 100%);
          overflow: hidden;
          font-family: 'Press Start 2P', monospace;
        }

        .stardew-textbox {
          background: #fffef7;
          border: 4px solid #8b6f47;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          color: #331a00;
          font-size: 18px;
          line-height: 1.6;
          min-height: 100px;
          transition: transform 0.2s;
        }

        .stardew-textbox:hover {
          transform: scale(1.02);
        }

        .animation-indicator {
          position: absolute;
          width: 100%;
          height: 100%;
          pointer-events: none;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            transform: translateY(20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .storyworld-renderer {
          animation: fadeIn 0.5s ease-in;
        }

        .stardew-textbox {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
