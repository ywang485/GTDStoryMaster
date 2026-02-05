"use client";

import { useSetupStore } from "@/stores/use-setup-store";

export function ProfileForm() {
  const { profile, setProfile } = useSetupStore();

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
        <label className="block text-sm text-gray-300">
          About you
        </label>
        <textarea
          value={profile.description}
          onChange={(e) => setProfile({ description: e.target.value })}
          placeholder="Describe yourself — gender, age, personality, hobbies, core values, belief systems, anything that helps the Story Master craft a meaningful adventure for you..."
          rows={6}
          className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}
