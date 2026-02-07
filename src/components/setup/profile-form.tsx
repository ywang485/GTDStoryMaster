"use client";

import { useSetupStore } from "@/stores/use-setup-store";

export function ProfileForm() {
  const { profile, setProfile } = useSetupStore();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-light text-black mb-1">
          Who Are You, Adventurer?
        </h2>
        <p className="text-gray-400 text-sm font-light">
          Tell us about yourself so we can craft a story that resonates with you.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-gray-500">Name</label>
        <input
          type="text"
          value={profile.name}
          onChange={(e) => setProfile({ name: e.target.value })}
          placeholder="Your name"
          className="w-full bg-white border border-gray-200 rounded-none px-3 py-2 text-black placeholder:text-gray-300 focus:border-black focus:outline-none font-light"
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm text-gray-500">
          About you
        </label>
        <textarea
          value={profile.description}
          onChange={(e) => setProfile({ description: e.target.value })}
          placeholder="Describe yourself — gender, age, personality, hobbies, core values, belief systems, anything that helps the Story Master craft a meaningful adventure for you..."
          rows={6}
          className="w-full bg-white border border-gray-200 rounded-none px-3 py-2 text-black placeholder:text-gray-300 focus:border-black focus:outline-none resize-none font-light"
        />
      </div>
    </div>
  );
}
