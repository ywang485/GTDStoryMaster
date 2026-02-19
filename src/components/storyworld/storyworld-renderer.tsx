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
  labelMaxWidth?: number;
  onNarrativeClick?: () => void;
}

export const StoryWorldRenderer = forwardRef<StoryWorldRendererInterface, StoryWorldRendererProps>(
  function StoryWorldRenderer(
    {
      executor,
      width = 800,
      height = 600,
      labelMaxWidth = 80,
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
    const [isStreamingText, setIsStreamingText] = useState(false);
    const [activeAnimations, setActiveAnimations] = useState<Set<string>>(new Set());

    // User input prompt state
    const [inputPromptActive, setInputPromptActive] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [inputExamples, setInputExamples] = useState<string[]>([]);
    const [inputPlaceholder, setInputPlaceholder] = useState("");
    const inputResolveRef = useRef<((value: string) => void) | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    // Deferred activation: getUserInput stores opts here; a useEffect activates
    // the prompt once all narrative text has been dismissed.
    const pendingInputRef = useRef<{ placeholder?: string; exampleResponses?: string[] } | null>(null);
    const [inputRequestTrigger, setInputRequestTrigger] = useState(0);

    // Billboard modal state
    const [billboardModal, setBillboardModal] = useState<{ content: string } | null>(null);

    // Hit areas for clickable canvas objects (billboard etc.)
    const objectBounds = useRef<{ id: string; typeId: string; x1: number; y1: number; x2: number; y2: number }[]>([]);

    // Placement mode state (click-to-place objects)
    const [placementPrompt, setPlacementPrompt] = useState<string | null>(null);
    const placementResolveRef = useRef<((pos: { x: number; y: number }) => void) | null>(null);
    const placementConstraints = useRef<{ minX: number; maxX: number; minY: number; maxY: number } | null>(null);
    const placementGhostSprite = useRef<string | null>(null);
    const cursorPosition = useRef<{ x: number; y: number } | null>(null);

    // Refs for synchronous access inside imperative handle (avoids stale closures)
    const isStreamingTextRef = useRef(false);
    const currentNarrativeRef = useRef("");
    const streamingBufferRef = useRef<string | null>(null);
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
            currentNarrativeRef.current = text;
          }
        }
      },
      streamText(text: string) {
        if (isStreamingTextRef.current) {
          // Already streaming — update the textbox directly
          setCurrentNarrative(text);
          currentNarrativeRef.current = text;
        } else if (currentNarrativeRef.current === "") {
          // Textbox is free — start streaming
          setCurrentNarrative(text);
          currentNarrativeRef.current = text;
          isStreamingTextRef.current = true;
          setIsStreamingText(true);
        } else {
          // Committed text or queue waiting — buffer the partial text
          streamingBufferRef.current = text;
        }
      },
      commitStreamedText() {
        if (isStreamingTextRef.current) {
          isStreamingTextRef.current = false;
          setIsStreamingText(false);
        }
      },
      getUserInput(opts?: { placeholder?: string; exampleResponses?: string[] }) {
        return new Promise<string>((resolve) => {
          inputResolveRef.current = resolve;
          pendingInputRef.current = opts ?? {};
          // Bump trigger so the deferred-activation effect re-evaluates
          setInputRequestTrigger((n) => n + 1);
        });
      },
      getPositionInput(opts?: {
        prompt?: string;
        constrainTo?: { minX: number; maxX: number; minY: number; maxY: number };
        ghostSpriteId?: string;
      }) {
        return new Promise<{ x: number; y: number }>((resolve) => {
          placementResolveRef.current = resolve;
          placementConstraints.current = opts?.constrainTo ?? null;
          placementGhostSprite.current = opts?.ghostSpriteId ?? null;
          setPlacementPrompt(opts?.prompt ?? "Click to choose position");
        });
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
      } else if (obj.typeId === "billboard") {
        stateKey = "default";
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

      // Reset hit bounds each frame
      objectBounds.current = [];

      // Render objects
      const objects = Object.values(state.objects);

      objects.forEach((obj, index) => {
        // Use stored position if available, otherwise fall back to grid layout
        const x = obj.renderState?.position?.x ?? (100 + (index % 6) * 120);
        const y = obj.renderState?.position?.y ?? (canvas.height / 2 + 50 + Math.floor(index / 6) * 100);

        const spriteId = getSpriteForObject(obj);
        const spriteImage = spriteId ? spriteImages.current.get(spriteId) : null;
        const metadata = spriteId ? spriteMetadata.current.get(spriteId) : null;

        // Billboard: sprite render (when loaded) or procedural fallback + record hit bounds
        if (obj.typeId === "billboard") {
          if (spriteImage) {
            const scale = metadata?.scale || 2.0;
            const spriteWidth = spriteImage.naturalWidth * scale;
            const spriteHeight = spriteImage.naturalHeight * scale;
            ctx.drawImage(spriteImage, x - spriteWidth / 2, y - spriteHeight / 2, spriteWidth, spriteHeight);
            objectBounds.current.push({ id: obj.id, typeId: "billboard", x1: x - spriteWidth / 2, y1: y - spriteHeight / 2, x2: x + spriteWidth / 2, y2: y + spriteHeight / 2 });
          } else {
            renderBillboard(ctx, x, y, obj);
            // Sign board bounds: 80px wide, 50px tall, centered at x, from y-90 to y-40
            objectBounds.current.push({ id: obj.id, typeId: "billboard", x1: x - 40, y1: y - 90, x2: x + 40, y2: y - 40 });
          }
          ctx.fillStyle = "#000000";
          ctx.font = "10px monospace";
          ctx.textAlign = "center";
          const billboardLabel: string = obj.state.label || obj.id;
          ctx.fillText(billboardLabel, x, y + 30);
          return;
        }

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

        // Label (word-wrap if wider than labelMaxWidth)
        ctx.fillStyle = "#000000";
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        const labelText: string = obj.state.label || obj.id;
        const words = labelText.split(" ");
        const lines: string[] = [];
        let currentLine = words[0];
        for (let w = 1; w < words.length; w++) {
          const test = currentLine + " " + words[w];
          if (ctx.measureText(test).width > labelMaxWidth) {
            lines.push(currentLine);
            currentLine = words[w];
          } else {
            currentLine = test;
          }
        }
        lines.push(currentLine);
        const lineHeight = 12;
        for (let l = 0; l < lines.length; l++) {
          ctx.fillText(lines[l], x, y + 40 + l * lineHeight);
        }
      });

      // Draw ghost sprite during placement mode
      if (placementResolveRef.current && cursorPosition.current) {
        const pos = cursorPosition.current;
        const ghostId = placementGhostSprite.current;
        const ghostImage = ghostId ? spriteImages.current.get(ghostId) : null;
        const ghostMeta = ghostId ? spriteMetadata.current.get(ghostId) : null;

        ctx.globalAlpha = 0.5;
        if (ghostImage && ghostMeta) {
          const tileSize = ghostMeta.tileSize || 16;
          const scale = ghostMeta.scale || 4.0;
          const sw = tileSize * scale;
          const sh = tileSize * scale;

          if (ghostMeta.tileIndex !== undefined) {
            const tilesPerRow = ghostMeta.tilesPerRow || 16;
            const tileCol = ghostMeta.tileIndex % tilesPerRow;
            const tileRow = Math.floor(ghostMeta.tileIndex / tilesPerRow);
            const sx = tileCol * tileSize;
            const sy = tileRow * tileSize;
            ctx.drawImage(ghostImage, sx, sy, tileSize, tileSize, pos.x - sw / 2, pos.y - sh / 2, sw, sh);
          } else {
            ctx.drawImage(ghostImage, pos.x - sw / 2, pos.y - sh / 2, sw, sh);
          }
        } else {
          // Fallback: draw a simple placeholder
          ctx.fillStyle = "#8B4513";
          ctx.fillRect(pos.x - 15, pos.y - 5, 30, 10);
          ctx.fillStyle = "#90EE90";
          ctx.fillRect(pos.x - 3, pos.y - 10, 6, 10);
        }
        ctx.globalAlpha = 1.0;
      }
    }, [executor, getSpriteForObject]);

    // -----------------------------------------------------------------------
    // Procedural fallback renderers
    // -----------------------------------------------------------------------

    const renderBillboard = (ctx: CanvasRenderingContext2D, x: number, y: number, _obj: any) => {
      // Wooden post
      ctx.fillStyle = "#8B5E3C";
      ctx.fillRect(x - 3, y - 50, 6, 50);

      // Sign board background
      ctx.fillStyle = "#C8A96B";
      ctx.fillRect(x - 40, y - 90, 80, 50);

      // Sign board border
      ctx.strokeStyle = "#6B4226";
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 40, y - 90, 80, 50);

      // Nails (corner dots)
      ctx.fillStyle = "#555";
      for (const [nx, ny] of [[-35, -85], [32, -85], [-35, -44], [32, -44]]) {
        ctx.beginPath();
        ctx.arc(x + nx, y + ny, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      // "Click me" indicator — small arrow icon
      ctx.fillStyle = "#6B4226";
      ctx.font = "bold 10px monospace";
      ctx.textAlign = "center";
      ctx.fillText("📋", x, y - 58);
    };

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
      currentNarrativeRef.current = "";

      const interval = setInterval(() => {
        if (index < text.length) {
          currentNarrativeRef.current += text[index];
          setCurrentNarrative((prev) => prev + text[index]);
          index++;
        } else {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, speed);
    };

    // -----------------------------------------------------------------------
    // User input prompt
    // -----------------------------------------------------------------------

    const handleInputSubmit = useCallback((text: string) => {
      if (!text.trim()) return;
      setInputPromptActive(false);
      setInputValue("");
      setInputExamples([]);
      inputResolveRef.current?.(text.trim());
      inputResolveRef.current = null;
    }, []);

    // Auto-focus the input field when the prompt appears
    useEffect(() => {
      if (inputPromptActive) {
        // Small delay to let the DOM render before focusing
        const timer = setTimeout(() => inputRef.current?.focus(), 50);
        return () => clearTimeout(timer);
      }
    }, [inputPromptActive]);

    // Deferred activation: show the input prompt once all narrative text is dismissed
    useEffect(() => {
      if (
        pendingInputRef.current &&
        !inputPromptActive &&
        !currentNarrative &&
        narrativeQueue.length === 0 &&
        !isTyping &&
        !isStreamingText
      ) {
        const opts = pendingInputRef.current;
        pendingInputRef.current = null;
        setInputValue("");
        setInputExamples(opts.exampleResponses ?? []);
        setInputPlaceholder(opts.placeholder ?? "");
        setInputPromptActive(true);
      }
    }, [currentNarrative, narrativeQueue.length, isTyping, isStreamingText, inputPromptActive, inputRequestTrigger]);

    // -----------------------------------------------------------------------
    // Placement mode: canvas mouse handlers
    // -----------------------------------------------------------------------

    const clampToConstraints = useCallback((cx: number, cy: number) => {
      const c = placementConstraints.current;
      if (!c) return { x: cx, y: cy };
      return {
        x: Math.max(c.minX, Math.min(c.maxX, cx)),
        y: Math.max(c.minY, Math.min(c.maxY, cy)),
      };
    }, []);

    const toCanvasCoords = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      // Use offsetX/offsetY (relative to the canvas element itself) rather than
      // clientX - rect.left to avoid inaccuracies when getBoundingClientRect()
      // is affected by ancestor CSS layout (flex centering, overflow-hidden, etc).
      const scaleX = canvas.width / canvas.offsetWidth;
      const scaleY = canvas.height / canvas.offsetHeight;
      return {
        x: e.nativeEvent.offsetX * scaleX,
        y: e.nativeEvent.offsetY * scaleY,
      };
    }, []);

    const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!placementResolveRef.current) return;
      const raw = toCanvasCoords(e);
      cursorPosition.current = clampToConstraints(raw.x, raw.y);
    }, [toCanvasCoords, clampToConstraints]);

    const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
      const raw = toCanvasCoords(e);

      // Placement mode takes priority
      if (placementResolveRef.current) {
        const pos = clampToConstraints(raw.x, raw.y);
        const resolve = placementResolveRef.current;
        placementResolveRef.current = null;
        placementConstraints.current = null;
        placementGhostSprite.current = null;
        cursorPosition.current = null;
        setPlacementPrompt(null);
        resolve(pos);
        return;
      }

      // Check for billboard clicks
      const hit = objectBounds.current.find(
        (b) => b.typeId === "billboard" && raw.x >= b.x1 && raw.x <= b.x2 && raw.y >= b.y1 && raw.y <= b.y2,
      );
      if (hit) {
        const obj = executor.getState().objects[hit.id];
        if (obj) {
          setBillboardModal({ content: obj.state.content as string || "" });
        }
      }
    }, [executor, toCanvasCoords, clampToConstraints]);

    const handleNarrativeClick = () => {
      if (isTyping) {
        setIsTyping(false);
        return;
      }

      // Ignore clicks while actively streaming
      if (isStreamingTextRef.current) {
        return;
      }

      if (narrativeQueue.length > 0) {
        const [next, ...rest] = narrativeQueue;
        setNarrativeQueue(rest);
        typewriterEffect(next, 40);
        onNarrativeClick?.();
      } else if (streamingBufferRef.current !== null) {
        // Show buffered streaming text and resume streaming
        const bufferedText = streamingBufferRef.current;
        streamingBufferRef.current = null;
        setCurrentNarrative(bufferedText);
        currentNarrativeRef.current = bufferedText;
        isStreamingTextRef.current = true;
        setIsStreamingText(true);
        onNarrativeClick?.();
      } else {
        setCurrentNarrative("");
        currentNarrativeRef.current = "";
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
          className={`absolute inset-0${placementPrompt ? " cursor-crosshair" : ""}`}
          onMouseMove={handleCanvasMouseMove}
          onClick={handleCanvasClick}
        />

        {currentNarrative && !inputPromptActive && (
          <div
            className="absolute bottom-4 left-4 right-4 cursor-pointer"
            onClick={handleNarrativeClick}
          >
            <div className="stardew-textbox">
              <p className="text-lg leading-relaxed">
                {currentNarrative}
                {isStreamingText && <span className="animate-pulse ml-0.5">▌</span>}
              </p>
              {!isTyping && !isStreamingText && narrativeQueue.length === 0 && streamingBufferRef.current === null && (
                <div className="text-right text-sm opacity-70 mt-2">
                  (Click to close)
                </div>
              )}
              {!isTyping && !isStreamingText && (narrativeQueue.length > 0 || streamingBufferRef.current !== null) && (
                <div className="text-right text-sm opacity-70 mt-2">
                  (Click to continue)
                </div>
              )}
            </div>
          </div>
        )}

        {inputPromptActive && (
          <div className="absolute bottom-4 left-4 right-4">
            <div className="stardew-textbox">
              {inputExamples.length > 0 && (
                <div className="stardew-input-examples">
                  {inputExamples.map((example, i) => (
                    <button
                      key={i}
                      className="stardew-example-btn"
                      onClick={() => handleInputSubmit(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleInputSubmit(inputValue);
                }}
              >
                <div className="stardew-input-row">
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={inputPlaceholder || "Type your response..."}
                    className="stardew-input"
                  />
                  <button
                    type="submit"
                    className="stardew-submit-btn"
                    disabled={!inputValue.trim()}
                  >
                    OK
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {placementPrompt && (
          <div className="absolute top-4 left-4 right-4 flex justify-center pointer-events-none">
            <div className="stardew-textbox" style={{ padding: "10px 20px", minHeight: "auto" }}>
              <p className="text-sm text-center">{placementPrompt}</p>
            </div>
          </div>
        )}

        {Array.from(activeAnimations).map((id) => (
          <div key={id} className="animation-indicator" />
        ))}

        {billboardModal && (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.55)", zIndex: 50 }}
            onClick={() => setBillboardModal(null)}
          >
            <div
              className="billboard-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="billboard-modal-content"
                dangerouslySetInnerHTML={{ __html: billboardModal.content || "<em>No content yet.</em>" }}
              />
              <div className="billboard-modal-footer">
                <button
                  className="stardew-submit-btn"
                  onClick={() => setBillboardModal(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

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

          .stardew-input-examples {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-bottom: 12px;
          }

          .stardew-example-btn {
            background: #8b6f47;
            color: #fffef7;
            border: 2px solid #6b5333;
            border-radius: 6px;
            padding: 6px 14px;
            font-size: 14px;
            font-family: inherit;
            cursor: pointer;
            transition: background 0.15s, transform 0.1s;
          }

          .stardew-example-btn:hover {
            background: #a0824f;
            transform: translateY(-1px);
          }

          .stardew-example-btn:active {
            transform: translateY(0);
          }

          .stardew-input-row {
            display: flex;
            gap: 8px;
          }

          .stardew-input {
            flex: 1;
            background: #f5f0e0;
            border: 2px solid #c4a876;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 16px;
            font-family: inherit;
            color: #331a00;
            outline: none;
          }

          .stardew-input:focus {
            border-color: #8b6f47;
            box-shadow: 0 0 0 2px rgba(139, 111, 71, 0.3);
          }

          .stardew-input::placeholder {
            color: #a89070;
          }

          .stardew-submit-btn {
            background: #5a8f3d;
            color: #fffef7;
            border: 2px solid #3d6b28;
            border-radius: 6px;
            padding: 8px 18px;
            font-size: 16px;
            font-family: inherit;
            cursor: pointer;
            transition: background 0.15s;
          }

          .stardew-submit-btn:hover:not(:disabled) {
            background: #6ba347;
          }

          .stardew-submit-btn:disabled {
            opacity: 0.5;
            cursor: default;
          }

          .billboard-modal {
            background: #fffef7;
            border: 4px solid #8b6f47;
            border-radius: 8px;
            padding: 24px;
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.5);
            color: #331a00;
            max-width: 480px;
            width: 90%;
            max-height: 70%;
            display: flex;
            flex-direction: column;
            gap: 16px;
            animation: slideUp 0.25s ease-out;
          }

          .billboard-modal-content {
            overflow-y: auto;
            font-size: 15px;
            line-height: 1.6;
            font-family: Georgia, serif;
          }

          .billboard-modal-content :global(h1),
          .billboard-modal-content :global(h2),
          .billboard-modal-content :global(h3) {
            font-family: 'Press Start 2P', monospace;
            color: #6b4226;
            margin: 0.5em 0;
          }

          .billboard-modal-content :global(ul),
          .billboard-modal-content :global(ol) {
            padding-left: 1.4em;
          }

          .billboard-modal-content :global(a) {
            color: #5a8f3d;
            text-decoration: underline;
          }

          .billboard-modal-footer {
            display: flex;
            justify-content: flex-end;
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
