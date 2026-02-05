"use client";

import { useSetupStore } from "@/stores/use-setup-store";

export function ProfileForm() {
  const { profile, setProfile } = useSetupStore();

  const handleArrayInput = (
    field: "hobbies" | "coreValues" | "beliefSystems",
    value: string,
  ) => {
    const items = value
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setProfile({ [field]: items });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-amber-400 mb-1">
          Who Are You, Adventurer?
        </h2>
        <p className="text-gray-400 text-sm">
          Tell us about yourself so we can craft a story that resonates with you.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="block text-sm text-gray-300">Name</label>
          <input
            type="text"
            value={profile.name}
            onChange={(e) => setProfile({ name: e.target.value })}
            placeholder="Your name"
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-300">Gender</label>
          <input
            type="text"
            value={profile.gender}
            onChange={(e) => setProfile({ gender: e.target.value })}
            placeholder="How you identify"
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm text-gray-300">Age</label>
          <input
            type="number"
            value={profile.age}
            onChange={(e) => setProfile({ age: parseInt(e.target.value) || 0 })}
            min={1}
            max={150}
            className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 focus:border-amber-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-gray-300">
          Describe your personality
        </label>
        <textarea
          value={profile.personality}
          onChange={(e) => setProfile({ personality: e.target.value })}
          placeholder="e.g., Introverted but curious, love problem-solving, tend to procrastinate on boring tasks but hyperfocus on interesting ones..."
          rows={3}
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none resize-none"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-gray-300">
          Hobbies{" "}
          <span className="text-gray-500">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={profile.hobbies.join(", ")}
          onChange={(e) => handleArrayInput("hobbies", e.target.value)}
          placeholder="e.g., reading, gaming, hiking, cooking"
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-gray-300">
          Core values{" "}
          <span className="text-gray-500">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={profile.coreValues.join(", ")}
          onChange={(e) => handleArrayInput("coreValues", e.target.value)}
          placeholder="e.g., honesty, creativity, growth, family"
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-gray-300">
          Belief systems{" "}
          <span className="text-gray-500">(comma-separated)</span>
        </label>
        <input
          type="text"
          value={profile.beliefSystems.join(", ")}
          onChange={(e) => handleArrayInput("beliefSystems", e.target.value)}
          placeholder="e.g., stoicism, growth mindset, environmental stewardship"
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none"
        />
      </div>
    </div>
  );
}
