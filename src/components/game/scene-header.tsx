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
    <div className="border-b border-gray-200 bg-white px-8 py-3">
      <div className="flex items-center justify-between max-w-3xl mx-auto">
        <div>
          {actTitle && (
            <span className="text-xs text-gray-400 uppercase tracking-widest">
              {actTitle}
            </span>
          )}
          <h2 className="text-base font-light text-black">{scene.title}</h2>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400 font-mono">
          <span>{environment.currentTime}</span>
          {environment.weather && <span>{environment.weather}</span>}
          {environment.mood && <span>{environment.mood}</span>}
        </div>
      </div>
    </div>
  );
}
