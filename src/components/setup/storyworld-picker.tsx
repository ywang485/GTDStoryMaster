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
        <h2 className="text-lg font-light text-black mb-1">
          Choose Your World
        </h2>
        <p className="text-gray-400 text-sm font-light">
          Select a storyworld for your adventure, or create your own.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {storyWorldPresets.map((preset) => (
          <button
            key={preset.id}
            onClick={() => handleSelectPreset(preset)}
            className={cn(
              "text-left p-4 border transition-all rounded-none",
              storyWorld?.id === preset.id && !isCustom
                ? "border-black"
                : "border-gray-200 hover:border-gray-400",
            )}
          >
            <h3 className="text-sm text-black mb-1">{preset.name}</h3>
            <p className="text-xs text-gray-400 font-light">{preset.description}</p>
          </button>
        ))}
      </div>

      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={() => setIsCustom(!isCustom)}
          className={cn(
            "text-sm font-light transition-colors",
            isCustom ? "text-black" : "text-gray-400 hover:text-black",
          )}
        >
          {isCustom ? "- Hide custom world builder" : "+ Create a custom world"}
        </button>

        {isCustom && (
          <div className="mt-4 space-y-4 p-4 border border-gray-200">
            <div className="space-y-2">
              <label className="block text-sm text-gray-500">World Name</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="e.g., The Wizarding World"
                className="w-full bg-white border border-gray-200 rounded-none px-3 py-2 text-black placeholder:text-gray-300 focus:border-black focus:outline-none font-light"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-gray-500">
                Description
              </label>
              <textarea
                value={customDesc}
                onChange={(e) => setCustomDesc(e.target.value)}
                placeholder="Describe the world, its setting, tone, rules, atmosphere... Include the name of any well-known IP if this is fan fiction (e.g., the world of Harry Potter)."
                rows={4}
                className="w-full bg-white border border-gray-200 rounded-none px-3 py-2 text-black placeholder:text-gray-300 focus:border-black focus:outline-none resize-none font-light"
              />
            </div>

            <button
              onClick={handleCustomSubmit}
              disabled={!customName.trim() || !customDesc.trim()}
              className="px-4 py-2 bg-black text-white font-light rounded-none hover:bg-gray-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors text-sm tracking-wide"
            >
              Use This World
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
