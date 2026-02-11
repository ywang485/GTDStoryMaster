/**
 * StoryWorld Demo Page
 *
 * Interactive demonstration of the Stardew Valley storyworld
 * with visual animations and sound effects.
 */

"use client";

import { useState, useEffect } from "react";
import { createStoryWorldExecutor, stardewValleyWorld } from "@/lib/storyworld";
import { StoryWorldRenderer } from "@/components/storyworld";
import type { StoryWorldExecutor } from "@/types/storyworld-definition";

export default function StoryWorldDemoPage() {
  const [executor, setExecutor] = useState<StoryWorldExecutor | null>(null);
  const [log, setLog] = useState<string[]>([]);

  // Initialize storyworld
  useEffect(() => {
    const exec = createStoryWorldExecutor(stardewValleyWorld);
    setExecutor(exec);

    // Create initial objects
    exec.createObject("crop", "tomato-1");
    exec.createObject("crop", "wheat-1");
    exec.createObject("livestock", "chicken-1", { name: "Clucky", type: "chicken" });
    exec.createObject("villager", "alex-1", { name: "Alex" });
    exec.createObject("facility", "shop-1", { type: "shop" });

    addLog("✅ Storyworld initialized!");
    addLog("📍 Objects created: Crops, Chicken, Villager, Shop");
  }, []);

  const addLog = (message: string) => {
    setLog((prev) => [...prev.slice(-9), message]);
  };

  const handleAction = async (
    objectId: string,
    actionId: string,
    params?: any
  ) => {
    if (!executor) return;

    try {
      const result = await executor.executeAction(objectId, actionId, params);

      if (result.success) {
        addLog(`✅ ${result.narrativeText}`);
      } else {
        addLog(`❌ ${result.error?.message}`);
      }
    } catch (error) {
      addLog(`❌ Error: ${error}`);
    }
  };

  const handleNarrative = async (text: string) => {
    if (!executor) return;

    const result = await executor.renderNarrative(text);
    if (result.success) {
      addLog(`📖 Narrative displayed`);
    }
  };

  if (!executor) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Loading storyworld...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-100 to-green-200 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 text-green-900">
          🌾 Stardew Valley StoryWorld Demo
        </h1>
        <p className="text-center text-green-700 mb-8">
          Interactive visual and audio demonstration
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Renderer */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg overflow-hidden">
              <StoryWorldRenderer
                executor={executor}
                world={stardewValleyWorld}
                width={800}
                height={600}
                onRenderComplete={(instruction) => {
                  console.log("Render complete:", instruction.type);
                }}
              />
            </div>

            {/* Log */}
            <div className="bg-white rounded-lg shadow-lg p-4 mt-4">
              <h3 className="text-lg font-bold mb-2">📋 Action Log</h3>
              <div className="space-y-1 font-mono text-sm h-40 overflow-y-auto">
                {log.map((entry, i) => (
                  <div key={i} className="text-gray-700">
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Controls */}
          <div className="space-y-4">
            {/* Crop Actions */}
            <ActionPanel
              title="🌱 Crop Actions"
              actions={[
                {
                  label: "Plant Tomato",
                  onClick: () =>
                    handleAction("tomato-1", "plant", {
                      cropType: "tomato",
                      season: "summer",
                    }),
                },
                {
                  label: "Water Crop",
                  onClick: () => handleAction("tomato-1", "water"),
                },
                {
                  label: "Grow Crop",
                  onClick: () => handleAction("tomato-1", "grow"),
                },
                {
                  label: "Fertilize",
                  onClick: () => handleAction("tomato-1", "fertilize"),
                },
                {
                  label: "Harvest",
                  onClick: () => handleAction("tomato-1", "harvest"),
                },
              ]}
            />

            {/* Livestock Actions */}
            <ActionPanel
              title="🐔 Livestock Actions"
              actions={[
                {
                  label: "Feed Chicken",
                  onClick: () => handleAction("chicken-1", "feed"),
                },
                {
                  label: "Pet Chicken",
                  onClick: () => handleAction("chicken-1", "pet"),
                },
                {
                  label: "Produce Egg",
                  onClick: () => handleAction("chicken-1", "produce"),
                },
                {
                  label: "Collect Produce",
                  onClick: () => handleAction("chicken-1", "collect_produce"),
                },
              ]}
            />

            {/* Villager Actions */}
            <ActionPanel
              title="👥 Villager Actions"
              actions={[
                {
                  label: "Talk to Alex",
                  onClick: () => handleAction("alex-1", "talk"),
                },
                {
                  label: "Give Gift (Regular)",
                  onClick: () =>
                    handleAction("alex-1", "give_gift", { item: "coffee" }),
                },
                {
                  label: "Give Gift (Loved)",
                  onClick: () =>
                    handleAction("alex-1", "give_gift", { item: "sunflower" }),
                },
                {
                  label: "Invite to Event",
                  onClick: () =>
                    handleAction("alex-1", "invite", { event: "flower_festival" }),
                },
              ]}
            />

            {/* Facility Actions */}
            <ActionPanel
              title="🏪 Facility Actions"
              actions={[
                {
                  label: "Enter Shop",
                  onClick: () =>
                    handleAction("shop-1", "enter", { currentHour: 10 }),
                },
                {
                  label: "Purchase Seeds",
                  onClick: () =>
                    handleAction("shop-1", "purchase", {
                      item: "seeds",
                      quantity: 5,
                    }),
                },
                {
                  label: "Upgrade Shop",
                  onClick: () =>
                    handleAction("shop-1", "upgrade", { cost: 10000 }),
                },
              ]}
            />

            {/* Narrative */}
            <ActionPanel
              title="📖 Narrative"
              actions={[
                {
                  label: "Morning Greeting",
                  onClick: () =>
                    handleNarrative(
                      "The sun rises over the peaceful valley. Birds chirp merrily in the trees. It's time to start another beautiful day on the farm!"
                    ),
                },
                {
                  label: "Harvest Joy",
                  onClick: () =>
                    handleNarrative(
                      "Your hard work has paid off! The crops are ready for harvest. You gather the fresh produce with a satisfied smile."
                    ),
                },
                {
                  label: "Animal Care",
                  onClick: () =>
                    handleNarrative(
                      "The animals are happy and healthy. Their contentment brings warmth to your heart. This is what farming is all about."
                    ),
                },
              ]}
            />

            {/* Info */}
            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
              <h3 className="font-bold text-blue-900 mb-2">ℹ️ Instructions</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Click actions to see animations</li>
                <li>• Hear sound effects (enable audio)</li>
                <li>• Watch particles fly!</li>
                <li>• Click textboxes to advance</li>
                <li>• Try different action combos</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
      `}</style>
    </div>
  );
}

function ActionPanel({
  title,
  actions,
}: {
  title: string;
  actions: Array<{ label: string; onClick: () => void }>;
}) {
  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <h3 className="text-lg font-bold mb-3 text-gray-800">{title}</h3>
      <div className="space-y-2">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded transition-colors"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  );
}
