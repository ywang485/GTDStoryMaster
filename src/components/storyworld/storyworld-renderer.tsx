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
  StoryWorldExecutor,
  StoryWorldDefinition,
} from "@/types/storyworld-definition";
import { SoundEngine } from "./sound-engine";
import { ParticleSystem } from "./particle-system";
import { SpriteRenderer } from "./sprite-renderer";

interface StoryWorldRendererProps {
  executor: StoryWorldExecutor;
  world: StoryWorldDefinition;
  width?: number;
  height?: number;
  onRenderComplete?: (instruction: RenderInstruction) => void;
  onNarrativeClick?: () => void;
}

export function StoryWorldRenderer({
  executor,
  world,
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
  const [, setForceUpdate] = useState(0);
  const processedRenders = useRef<Set<string>>(new Set());
  const backgroundImageRef = useRef<HTMLImageElement | null>(null);
  const spriteImages = useRef<Map<string, HTMLImageElement>>(new Map());
  const spriteMetadata = useRef<Map<string, {
    tileIndex?: number;
    tileSize?: number;
    tilesPerRow?: number;
  }>>(new Map());

  // Initialize systems
  useEffect(() => {
    soundEngineRef.current = new SoundEngine();
    particleSystemRef.current = new ParticleSystem(canvasRef.current!);
    spriteRendererRef.current = new SpriteRenderer(canvasRef.current!);

    // Load background image
    const bgImage = new Image();
    bgImage.src = '/assets/stardew_valley_bg.png';
    bgImage.onload = () => {
      backgroundImageRef.current = bgImage;
    };
    bgImage.onerror = () => {
      console.error('Failed to load background image');
    };

    // Load sprite images from storyworld definition
    const loadedTilesets = new Set<string>();

    world.objectTypes.forEach((objectType) => {
      if (objectType.assets?.stateAssets) {
        Object.entries(objectType.assets.stateAssets).forEach(([stateName, assets]) => {
          assets.forEach((asset: any) => {
            if (asset.type === "sprite" && asset.url) {
              // Store metadata for this sprite
              spriteMetadata.current.set(asset.id, {
                tileIndex: asset.tileIndex,
                tileSize: asset.tileSize || 16,
                tilesPerRow: asset.tilesPerRow || 16,
              });

              // Load the tileset image if not already loaded
              const tilesetKey = asset.url;
              if (!loadedTilesets.has(tilesetKey)) {
                loadedTilesets.add(tilesetKey);
                const img = new Image();
                img.src = asset.url;
                img.onload = () => {
                  spriteImages.current.set(tilesetKey, img);
                };
                img.onerror = () => {
                  console.error(`Failed to load tileset: ${asset.url}`);
                };
              }

              // Also map the sprite ID to the tileset for easy lookup
              if (!spriteImages.current.has(asset.id)) {
                // Wait for tileset to load, then create reference
                const checkTileset = setInterval(() => {
                  const tileset = spriteImages.current.get(tilesetKey);
                  if (tileset) {
                    spriteImages.current.set(asset.id, tileset);
                    clearInterval(checkTileset);
                  }
                }, 100);
              }
            }
          });
        });
      }
    });

    // Start main render loop
    const renderLoop = () => {
      renderScene();
      requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => {
      soundEngineRef.current?.cleanup();
      particleSystemRef.current?.cleanup();
      spriteRendererRef.current?.cleanup();
    };
  }, [world]);

  // Get the sprite ID for an object based on its current state
  const getSpriteForObject = useCallback((obj: any): string | null => {
    const objectType = world.objectTypes.find((ot) => ot.id === obj.typeId);
    if (!objectType?.assets?.stateAssets) return null;

    // Determine which state key to use based on object properties
    let stateKey: string | null = null;

    if (obj.typeId === "crop") {
      stateKey = `stage${obj.state.growthStage || 0}`;
    } else if (obj.typeId === "facility") {
      stateKey = obj.state.isOpen ? "open" : "closed";
    } else if (obj.typeId === "villager") {
      stateKey = obj.state.mood || "neutral";
    } else if (obj.typeId === "livestock") {
      const happiness = obj.state.happiness || 50;
      if (happiness > 70) stateKey = "happy";
      else if (happiness < 30) stateKey = "sick";
      else stateKey = "neutral";
    }

    if (!stateKey || !objectType.assets.stateAssets[stateKey]) return null;

    const assets = objectType.assets.stateAssets[stateKey];
    return assets[0]?.id || null;
  }, [world]);

  // Render the scene
  const renderScene = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    // Process new render instructions
    const state = executor.getState();
    state.activeRenders.forEach((render) => {
      if (!processedRenders.current.has(render.id)) {
        processedRenders.current.add(render.id);
        executeRenderInstruction(render.instruction);
      }
    });

    // Clean up expired renders
    executor.cleanupExpiredRenders();

    // Draw background image
    if (backgroundImageRef.current) {
      ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
    } else {
      // Fallback to solid color while loading
      ctx.fillStyle = "#87CEEB";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // Render objects from state
    const objects = Object.values(state.objects);

    objects.forEach((obj, index) => {
      const x = 100 + (index % 6) * 120;
      const y = canvas.height / 2 + 50 + Math.floor(index / 6) * 100;

      // Get sprite for this object's current state
      const spriteId = getSpriteForObject(obj);
      const spriteImage = spriteId ? spriteImages.current.get(spriteId) : null;
      const metadata = spriteId ? spriteMetadata.current.get(spriteId) : null;

      if (spriteImage) {
        // Draw the sprite image
        const spriteWidth = 64;
        const spriteHeight = 64;

        if (metadata?.tileIndex !== undefined) {
          // Draw from tileset using tile index
          const tileSize = metadata.tileSize || 16;
          const tilesPerRow = metadata.tilesPerRow || 16;
          const tileIndex = metadata.tileIndex;

          // Calculate source position in tileset
          const tileCol = tileIndex % tilesPerRow;
          const tileRow = Math.floor(tileIndex / tilesPerRow);
          const sx = tileCol * tileSize;
          const sy = tileRow * tileSize;

          // Draw the tile
          ctx.drawImage(
            spriteImage,
            sx, sy, tileSize, tileSize,  // source
            x - spriteWidth / 2, y - spriteHeight / 2, spriteWidth, spriteHeight  // destination
          );
        } else {
          // Draw full image (single sprite)
          ctx.drawImage(
            spriteImage,
            x - spriteWidth / 2,
            y - spriteHeight / 2,
            spriteWidth,
            spriteHeight
          );
        }
      } else {
        // Fallback to procedural rendering if sprite not loaded
        if (obj.typeId === "crop") {
          renderCrop(ctx, x, y, obj);
        } else if (obj.typeId === "livestock") {
          renderLivestock(ctx, x, y, obj);
        } else if (obj.typeId === "villager") {
          renderVillager(ctx, x, y, obj);
        } else if (obj.typeId === "facility") {
          renderFacility(ctx, x, y, obj);
        }
      }

      // Draw label
      ctx.fillStyle = "#000000";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(obj.id, x, y + 40);
    });
  }, [executor, getSpriteForObject]);

  const renderCrop = (ctx: CanvasRenderingContext2D, x: number, y: number, obj: any) => {
    const stage = obj.state.growthStage || 0;
    const watered = obj.state.watered;

    // Draw soil
    ctx.fillStyle = watered ? "#654321" : "#8B4513";
    ctx.fillRect(x - 15, y - 5, 30, 10);

    // Draw crop based on growth stage
    if (stage === 0) {
      // Seeds
      ctx.fillStyle = "#8B4513";
      for (let i = 0; i < 3; i++) {
        ctx.fillRect(x + (i - 1) * 4 - 2, y - 2, 4, 4);
      }
    } else if (stage === 1) {
      // Sprout
      ctx.fillStyle = "#90EE90";
      ctx.fillRect(x - 3, y - 10, 6, 10);
    } else if (stage === 2) {
      // Growing
      ctx.fillStyle = "#228B22";
      ctx.fillRect(x - 2, y - 20, 4, 20);
      ctx.fillStyle = "#90EE90";
      ctx.fillRect(x - 6, y - 15, 4, 4);
      ctx.fillRect(x + 2, y - 15, 4, 4);
    } else if (stage === 3) {
      // Maturing
      ctx.fillStyle = "#228B22";
      ctx.fillRect(x - 2, y - 25, 4, 25);
      ctx.fillStyle = "#FFD700";
      ctx.beginPath();
      ctx.arc(x, y - 28, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (stage >= 4) {
      // Mature
      ctx.fillStyle = "#228B22";
      ctx.fillRect(x - 2, y - 25, 4, 25);
      ctx.fillStyle = "#FF6347";
      ctx.beginPath();
      ctx.arc(x, y - 28, 6, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw watered indicator
    if (watered) {
      ctx.fillStyle = "rgba(100, 149, 237, 0.3)";
      ctx.fillRect(x - 15, y - 5, 30, 10);
    }
  };

  const renderLivestock = (ctx: CanvasRenderingContext2D, x: number, y: number, obj: any) => {
    const type = obj.state.type;
    const happiness = obj.state.happiness || 50;

    if (type === "chicken") {
      // Chicken body
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(x - 8, y - 15, 16, 12);
      ctx.fillRect(x - 6, y - 21, 12, 8);

      // Beak
      ctx.fillStyle = "#FFA500";
      ctx.fillRect(x + 6, y - 17, 4, 3);

      // Eye
      ctx.fillStyle = "#000000";
      ctx.fillRect(x + 2, y - 19, 2, 2);

      // Legs
      ctx.fillStyle = "#FFA500";
      ctx.fillRect(x - 4, y - 3, 2, 6);
      ctx.fillRect(x + 2, y - 3, 2, 6);
    } else if (type === "cow") {
      // Cow body
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(x - 16, y - 20, 32, 16);
      ctx.fillRect(x - 10, y - 28, 20, 12);

      // Spots
      ctx.fillStyle = "#000000";
      ctx.fillRect(x - 10, y - 16, 6, 6);
      ctx.fillRect(x + 4, y - 16, 6, 6);

      // Legs
      ctx.fillRect(x - 12, y - 4, 4, 10);
      ctx.fillRect(x + 8, y - 4, 4, 10);
    }

    // Happiness indicator
    if (happiness > 70) {
      ctx.fillStyle = "#FF69B4";
      ctx.beginPath();
      ctx.arc(x, y - 30, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const renderVillager = (ctx: CanvasRenderingContext2D, x: number, y: number, obj: any) => {
    const friendshipLevel = obj.state.friendshipLevel || 0;

    // Head
    ctx.fillStyle = "#FFD1A4";
    ctx.fillRect(x - 8, y - 32, 16, 16);

    // Hair
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(x - 8, y - 36, 16, 6);

    // Body
    ctx.fillStyle = "#4169E1";
    ctx.fillRect(x - 10, y - 16, 20, 16);

    // Legs
    ctx.fillStyle = "#2F4F4F";
    ctx.fillRect(x - 8, y, 6, 12);
    ctx.fillRect(x + 2, y, 6, 12);

    // Friendship hearts
    for (let i = 0; i < Math.min(friendshipLevel, 5); i++) {
      ctx.fillStyle = "#FF69B4";
      ctx.fillRect(x - 20 + i * 6, y - 40, 4, 4);
    }
  };

  const renderFacility = (ctx: CanvasRenderingContext2D, x: number, y: number, obj: any) => {
    // Building
    ctx.fillStyle = "#CD853F";
    ctx.fillRect(x - 30, y - 50, 60, 50);

    // Roof
    ctx.fillStyle = "#8B4513";
    ctx.beginPath();
    ctx.moveTo(x - 35, y - 50);
    ctx.lineTo(x, y - 65);
    ctx.lineTo(x + 35, y - 50);
    ctx.closePath();
    ctx.fill();

    // Door
    ctx.fillStyle = obj.state.isOpen ? "#654321" : "#3D2817";
    ctx.fillRect(x - 8, y - 10, 16, 10);

    // Windows
    ctx.fillStyle = "#87CEEB";
    ctx.fillRect(x - 20, y - 35, 10, 10);
    ctx.fillRect(x + 10, y - 35, 10, 10);
  };

  // No longer needed - renderScene handles everything

  const executeRenderInstruction = useCallback(
    (instruction: RenderInstruction) => {
      const id = `${instruction.type}-${Date.now()}`;
      console.log("Executing render instruction:", instruction.type, instruction);

      switch (instruction.type) {
        case "display_text":
          console.log("Displaying text:", instruction.text);
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

    // For click-to-advance, show immediately if nothing is showing
    if (style.waitForClick) {
      if (!currentNarrative && !isTyping) {
        // Show this one immediately
        typewriterEffect(instruction.text, style.speed || 40);
      } else {
        // Queue it for later
        setNarrativeQueue((prev) => [...prev, instruction.text!]);
      }
    } else {
      // Show immediately without queue
      if (style.animation === "typewriter") {
        typewriterEffect(instruction.text, style.speed || 50);
      } else {
        setCurrentNarrative(instruction.text);
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
