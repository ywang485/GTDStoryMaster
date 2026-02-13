/**
 * StoryWorld Renderer Component
 *
 * Implements StoryWorldRendererInterface so executors can call
 * render methods directly from action handlers.
 *
 * Uses CSS animations, Canvas for sprites, and Web Audio API for sounds.
 */

"use client";

import { useEffect, useRef, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import type { StoryWorldRendererInterface } from "@/lib/storyworld/renderer-interface";
import { SoundEngine } from "./sound-engine";
import { ParticleSystem } from "./particle-system";
import { SpriteRenderer } from "./sprite-renderer";
import type { BaseStoryWorldExecutor } from "@/lib/storyworld/base-storyworld-executor";

interface StoryWorldRendererProps {
  executor: BaseStoryWorldExecutor;
  width?: number;
  height?: number;
  onNarrativeClick?: () => void;
}

export const StoryWorldRenderer = forwardRef<StoryWorldRendererInterface, StoryWorldRendererProps>(
  function StoryWorldRenderer(
    {
      executor,
      width = 800,
      height = 600,
      onNarrativeClick,
    },
    ref,
  ) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const soundEngineRef = useRef<SoundEngine | null>(null);
    const particleSystemRef = useRef<ParticleSystem | null>(null);
    const spriteRendererRef = useRef<SpriteRenderer | null>(null);

    const [narrativeQueue, setNarrativeQueue] = useState<string[]>([]);
    const [currentNarrative, setCurrentNarrative] = useState<string>("");
    const [isTyping, setIsTyping] = useState(false);
    const [activeAnimations, setActiveAnimations] = useState<Set<string>>(new Set());
    const backgroundImageRef = useRef<HTMLImageElement | null>(null);
    const spriteImages = useRef<Map<string, HTMLImageElement>>(new Map());
    const spriteMetadata = useRef<Map<string, {
      tileIndex?: number;
      tileSize?: number;
      tilesPerRow?: number;
      scale?: number;
    }>>(new Map());

    // -----------------------------------------------------------------------
    // Expose StoryWorldRendererInterface via ref
    // -----------------------------------------------------------------------
    useImperativeHandle(ref, () => ({
      playAnimation(assetId: string, opts?: { duration?: number; position?: { x: number; y: number } }) {
        const id = `anim-${Date.now()}-${assetId}`;
        setActiveAnimations((prev) => new Set(prev).add(id));
        spriteRendererRef.current?.playAnimation(assetId, opts?.position, opts?.duration || 1000);
        if (opts?.duration) {
          setTimeout(() => {
            setActiveAnimations((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }, opts.duration);
        }
      },
      playSound(assetId: string) {
        soundEngineRef.current?.playSound(assetId);
      },
      playMusic(assetId: string) {
        soundEngineRef.current?.playMusic(assetId);
      },
      showParticle(assetId: string, opts?: { duration?: number; position?: { x: number; y: number } }) {
        const id = `particle-${Date.now()}-${assetId}`;
        setActiveAnimations((prev) => new Set(prev).add(id));
        particleSystemRef.current?.emit(
          assetId,
          opts?.position || { x: width / 2, y: height / 2 },
          opts?.duration || 1000,
        );
        if (opts?.duration) {
          setTimeout(() => {
            setActiveAnimations((prev) => {
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }, opts.duration);
        }
      },
      showSprite(assetId: string, opts?: { scale?: number; rotation?: number; opacity?: number; position?: { x: number; y: number } }) {
        const id = `sprite-${Date.now()}-${assetId}`;
        setActiveAnimations((prev) => new Set(prev).add(id));
        spriteRendererRef.current?.showSprite(assetId, opts?.position, {
          scale: opts?.scale,
          rotation: opts?.rotation,
          opacity: opts?.opacity,
        });
      },
      displayText(text: string, opts?: { animation?: string; speed?: number; waitForClick?: boolean }) {
        const speed = opts?.speed || 40;
        const waitForClick = opts?.waitForClick ?? true;

        if (waitForClick) {
          if (!currentNarrative && !isTyping) {
            typewriterEffect(text, speed);
          } else {
            setNarrativeQueue((prev) => [...prev, text]);
          }
        } else {
          if (opts?.animation === "typewriter") {
            typewriterEffect(text, speed);
          } else {
            setCurrentNarrative(text);
          }
        }
      },
    }), [currentNarrative, isTyping, width, height]);

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

      // Load sprite images from executor assets
      const loadedTilesets = new Set<string>();
      const allObjectAssets = executor.getObjectAssets();

      Object.values(allObjectAssets).forEach((assetLibrary) => {
        if (assetLibrary.stateAssets) {
          Object.entries(assetLibrary.stateAssets).forEach(([, assets]) => {
            assets.forEach((asset) => {
              if (asset.type === "sprite" && asset.url) {
                spriteMetadata.current.set(asset.id, {
                  tileIndex: asset.tileIndex,
                  tileSize: asset.tileSize || 16,
                  tilesPerRow: asset.tilesPerRow || 16,
                  scale: asset.scale || 4.0,
                });

                const tilesetKey = asset.url;
                if (!loadedTilesets.has(tilesetKey)) {
                  loadedTilesets.add(tilesetKey);
                  const img = new Image();
                  img.src = asset.url;
                  img.onload = () => {
                    spriteImages.current.set(tilesetKey, img);
                  };
                }

                if (!spriteImages.current.has(asset.id)) {
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
    }, [executor]);

    // Get the sprite ID for an object based on its current state
    const getSpriteForObject = useCallback((obj: any): string | null => {
      const assetLibrary = executor.getObjectAssets()[obj.typeId];
      if (!assetLibrary?.stateAssets) return null;

      let stateKey: string | null = null;

      if (obj.typeId === "crop") {
        stateKey = obj.state.wilted ? "wilted" : `stage${obj.state.growthStage || 0}`;
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

      if (!stateKey || !assetLibrary.stateAssets[stateKey]) return null;

      const assets = assetLibrary.stateAssets[stateKey];
      return assets[0]?.id || null;
    }, [executor]);

    // Render the scene
    const renderScene = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext("2d");
      if (!canvas || !ctx) return;

      const state = executor.getState();

      // Draw background
      if (backgroundImageRef.current) {
        ctx.drawImage(backgroundImageRef.current, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = "#87CEEB";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Render objects
      const objects = Object.values(state.objects);

      objects.forEach((obj, index) => {
        const x = 100 + (index % 6) * 120;
        const y = canvas.height / 2 + 50 + Math.floor(index / 6) * 100;

        const spriteId = getSpriteForObject(obj);
        const spriteImage = spriteId ? spriteImages.current.get(spriteId) : null;
        const metadata = spriteId ? spriteMetadata.current.get(spriteId) : null;

        if (spriteImage) {
          const tileSize = metadata?.tileSize || 16;
          const scale = metadata?.scale || 4.0;
          const spriteWidth = tileSize * scale;
          const spriteHeight = tileSize * scale;

          if (metadata?.tileIndex !== undefined) {
            const tilesPerRow = metadata.tilesPerRow || 16;
            const tileCol = metadata.tileIndex % tilesPerRow;
            const tileRow = Math.floor(metadata.tileIndex / tilesPerRow);
            const sx = tileCol * tileSize;
            const sy = tileRow * tileSize;

            ctx.drawImage(
              spriteImage,
              sx, sy, tileSize, tileSize,
              x - spriteWidth / 2, y - spriteHeight / 2, spriteWidth, spriteHeight,
            );
          } else {
            ctx.drawImage(spriteImage, x - spriteWidth / 2, y - spriteHeight / 2, spriteWidth, spriteHeight);
          }
        } else {
          // Fallback procedural rendering
          if (obj.typeId === "crop") renderCrop(ctx, x, y, obj);
          else if (obj.typeId === "livestock") renderLivestock(ctx, x, y, obj);
          else if (obj.typeId === "villager") renderVillager(ctx, x, y, obj);
          else if (obj.typeId === "facility") renderFacility(ctx, x, y, obj);
        }

        // Label
        ctx.fillStyle = "#000000";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillText(obj.id, x, y + 40);
      });
    }, [executor, getSpriteForObject]);

    // -----------------------------------------------------------------------
    // Procedural fallback renderers
    // -----------------------------------------------------------------------

    const renderCrop = (ctx: CanvasRenderingContext2D, x: number, y: number, obj: any) => {
      const stage = obj.state.growthStage || 0;
      const watered = obj.state.watered;

      ctx.fillStyle = watered ? "#654321" : "#8B4513";
      ctx.fillRect(x - 15, y - 5, 30, 10);

      if (stage === 0) {
        ctx.fillStyle = "#8B4513";
        for (let i = 0; i < 3; i++) ctx.fillRect(x + (i - 1) * 4 - 2, y - 2, 4, 4);
      } else if (stage === 1) {
        ctx.fillStyle = "#90EE90";
        ctx.fillRect(x - 3, y - 10, 6, 10);
      } else if (stage === 2) {
        ctx.fillStyle = "#228B22";
        ctx.fillRect(x - 2, y - 20, 4, 20);
        ctx.fillStyle = "#90EE90";
        ctx.fillRect(x - 6, y - 15, 4, 4);
        ctx.fillRect(x + 2, y - 15, 4, 4);
      } else if (stage === 3) {
        ctx.fillStyle = "#228B22";
        ctx.fillRect(x - 2, y - 25, 4, 25);
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(x, y - 28, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (stage >= 4) {
        ctx.fillStyle = "#228B22";
        ctx.fillRect(x - 2, y - 25, 4, 25);
        ctx.fillStyle = "#FF6347";
        ctx.beginPath();
        ctx.arc(x, y - 28, 6, 0, Math.PI * 2);
        ctx.fill();
      }

      if (watered) {
        ctx.fillStyle = "rgba(100, 149, 237, 0.3)";
        ctx.fillRect(x - 15, y - 5, 30, 10);
      }
    };

    const renderLivestock = (ctx: CanvasRenderingContext2D, x: number, y: number, obj: any) => {
      const type = obj.state.type;
      const happiness = obj.state.happiness || 50;

      if (type === "chicken") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(x - 8, y - 15, 16, 12);
        ctx.fillRect(x - 6, y - 21, 12, 8);
        ctx.fillStyle = "#FFA500";
        ctx.fillRect(x + 6, y - 17, 4, 3);
        ctx.fillStyle = "#000000";
        ctx.fillRect(x + 2, y - 19, 2, 2);
        ctx.fillStyle = "#FFA500";
        ctx.fillRect(x - 4, y - 3, 2, 6);
        ctx.fillRect(x + 2, y - 3, 2, 6);
      } else if (type === "cow") {
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(x - 16, y - 20, 32, 16);
        ctx.fillRect(x - 10, y - 28, 20, 12);
        ctx.fillStyle = "#000000";
        ctx.fillRect(x - 10, y - 16, 6, 6);
        ctx.fillRect(x + 4, y - 16, 6, 6);
        ctx.fillRect(x - 12, y - 4, 4, 10);
        ctx.fillRect(x + 8, y - 4, 4, 10);
      }

      if (happiness > 70) {
        ctx.fillStyle = "#FF69B4";
        ctx.beginPath();
        ctx.arc(x, y - 30, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const renderVillager = (ctx: CanvasRenderingContext2D, x: number, y: number, obj: any) => {
      const friendshipLevel = obj.state.friendshipLevel || 0;

      ctx.fillStyle = "#FFD1A4";
      ctx.fillRect(x - 8, y - 32, 16, 16);
      ctx.fillStyle = "#8B4513";
      ctx.fillRect(x - 8, y - 36, 16, 6);
      ctx.fillStyle = "#4169E1";
      ctx.fillRect(x - 10, y - 16, 20, 16);
      ctx.fillStyle = "#2F4F4F";
      ctx.fillRect(x - 8, y, 6, 12);
      ctx.fillRect(x + 2, y, 6, 12);

      for (let i = 0; i < Math.min(friendshipLevel, 5); i++) {
        ctx.fillStyle = "#FF69B4";
        ctx.fillRect(x - 20 + i * 6, y - 40, 4, 4);
      }
    };

    const renderFacility = (ctx: CanvasRenderingContext2D, x: number, y: number, obj: any) => {
      ctx.fillStyle = "#CD853F";
      ctx.fillRect(x - 30, y - 50, 60, 50);
      ctx.fillStyle = "#8B4513";
      ctx.beginPath();
      ctx.moveTo(x - 35, y - 50);
      ctx.lineTo(x, y - 65);
      ctx.lineTo(x + 35, y - 50);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = obj.state.isOpen ? "#654321" : "#3D2817";
      ctx.fillRect(x - 8, y - 10, 16, 10);
      ctx.fillStyle = "#87CEEB";
      ctx.fillRect(x - 20, y - 35, 10, 10);
      ctx.fillRect(x + 10, y - 35, 10, 10);
    };

    // -----------------------------------------------------------------------
    // Narrative typewriter
    // -----------------------------------------------------------------------

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
        setIsTyping(false);
        return;
      }

      if (narrativeQueue.length > 0) {
        const [next, ...rest] = narrativeQueue;
        setNarrativeQueue(rest);
        typewriterEffect(next, 40);
        onNarrativeClick?.();
      } else {
        setCurrentNarrative("");
      }
    };

    return (
      <div
        className="storyworld-renderer relative"
        style={{ width, height }}
      >
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="absolute inset-0"
        />

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

        {Array.from(activeAnimations).map((id) => (
          <div key={id} className="animation-indicator" />
        ))}

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

          .storyworld-renderer {
            animation: fadeIn 0.5s ease-in;
          }

          .stardew-textbox {
            animation: slideUp 0.3s ease-out;
          }
        `}</style>
      </div>
    );
  },
);
