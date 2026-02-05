"use client";

import { useState } from "react";
import { useSetupStore } from "@/stores/use-setup-store";
import { storyWorldPresets } from "@/lib/storyworlds";
import { cn } from "@/lib/utils/cn";

export function StoryWorldPicker() {
  const { storyWorld, setStoryWorld } = useSetupStore();
  const [isCustom, setIsCustom] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customDesc, setCustomDesc] = useState("");

  const handleSelectPreset = (preset: (typeof storyWorldPresets)[number]) => {
    setIsCustom(false);
    setStoryWorld(preset);
  };

  const handleCustomSubmit = () => {
    if (customName.trim() && customDesc.trim()) {
      setStoryWorld({
        id: `custom-${Date.now()}`,
        name: customName,
        description: customDesc,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-amber-400 mb-1">
          Choose Your World
        </h2>
        <p className="text-gray-400 text-sm">
          Select a storyworld for your adventure, or create your own.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {storyWorldPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleSelectPreset(preset)}
            className={cn(
              "text-left p-4 rounded-lg border transition-all",
              storyWorld?.id === preset.id && !isCustom
                ? "border-amber-500 bg-amber-500/10"
                : "border-gray-700 bg-gray-900 hover:border-gray-500",
            )}
          >
            <h3 className="font-bold text-gray-100 mb-1">{preset.name}</h3>
            <p className="text-sm text-gray-400">{preset.description}</p>
          </button>
        ))}
      </div>

      <div className="border-t border-gray-800 pt-4">
        <button
          onClick={() => setIsCustom(!isCustom)}
          className={cn(
            "text-sm font-medium transition-colors",
            isCustom ? "text-amber-400" : "text-gray-400 hover:text-gray-200",
          )}
        >
          {isCustom ? "- Hide custom world builder" : "+ Create a custom world"}
        </button>

        {isCustom && (
          <div className="mt-4 space-y-4 p-4 rounded-lg border border-gray-700 bg-gray-900">
            <div className="space-y-2">
              <label className="block text-sm text-gray-300">World Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., The Wizarding World"
                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-gray-300">
                Description
              </label>
              <textarea
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="Describe the world, its setting, tone, rules, atmosphere... Include the name of any well-known IP if this is fan fiction (e.g., the world of Harry Potter)."
                rows={4}
                className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none resize-none"
              />
            </div>

            <button
              onClick={handleCustomSubmit}
              disabled={!customName.trim() || !customDesc.trim()}
              className="px-4 py-2 bg-amber-600 text-gray-950 font-medium rounded hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Use This World
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
