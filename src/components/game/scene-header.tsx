"use client";

import type { Scene } from "@/types/story";
import type { EnvironmentContext } from "@/types/game";

interface SceneHeaderProps {
  scene: Scene | null;
  environment: EnvironmentContext;
  actTitle?: string;
}

export function SceneHeader({ scene, environment, actTitle }: SceneHeaderProps) {
  if (!scene) return null;

  return (
    <div className="border-b border-gray-800 bg-gray-950/80 px-6 py-3">
      <div className="flex items-center justify-between">
        <div>
          {actTitle && (
            <span className="text-xs text-gray-500 uppercase tracking-wider">
              {actTitle}
            </span>
          )}
          <h2 className="text-lg font-bold text-amber-400">{scene.title}</h2>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>{environment.currentTime}</span>
          {environment.weather && <span>{environment.weather}</span>}
          {environment.mood && (
            <span className="text-amber-400/60">{environment.mood}</span>
          )}
        </div>
      </div>
    </div>
  );
}
