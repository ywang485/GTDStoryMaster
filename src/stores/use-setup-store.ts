"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlayerProfile } from "@/types/player";
import type { StoryWorld } from "@/types/storyworld";
import type { Task } from "@/types/task";
import type { AdventurerConfig } from "@/types/config";
import { getPresetById } from "@/lib/storyworlds";

interface SetupState {
  profile: PlayerProfile;
  storyWorld: StoryWorld | null;
  tasks: Task[];
  configApplied: boolean;

  setProfile: (profile: Partial<PlayerProfile>) => void;
  setStoryWorld: (world: StoryWorld) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  reorderTasks: (fromIndex: number, toIndex: number) => void;
  setTasks: (tasks: Task[]) => void;
  resetSetup: () => void;
  isSetupComplete: () => boolean;
  applyConfig: (config: AdventurerConfig) => void;
}

const defaultProfile: PlayerProfile = {
  name: "",
  description: "",
};

export const useSetupStore = create<SetupState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      storyWorld: null,
      tasks: [],
      configApplied: false,

      setProfile: (updates) =>
        set((state) => ({
          profile: { ...state.profile, ...updates },
        })),

      setStoryWorld: (world) => set({ storyWorld: world }),

      addTask: (task) =>
        set((state) => ({
          tasks: [...state.tasks, task],
        })),

      updateTask: (id, updates) =>
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === id ? { ...t, ...updates } : t,
          ),
        })),

      removeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== id),
        })),

      reorderTasks: (fromIndex, toIndex) =>
        set((state) => {
          const tasks = [...state.tasks];
          const [moved] = tasks.splice(fromIndex, 1);
          tasks.splice(toIndex, 0, moved);
          return { tasks };
        }),

      setTasks: (tasks) => set({ tasks }),

      resetSetup: () =>
        set({
          profile: defaultProfile,
          storyWorld: null,
          tasks: [],
          configApplied: false,
        }),

      applyConfig: (config) => {
        set((state) => {
          const updates: Partial<SetupState> = { configApplied: true };

          // Apply profile fields (merge onto defaults, don't overwrite localStorage values
          // if the user has already edited them in a previous session)
          if (config.profile && (state.profile.name === "" || state.profile.description === "")) {
            updates.profile = {
              ...defaultProfile,
              ...state.profile,
              ...config.profile,
            };
          }

          if (config.storyWorld && state.storyWorld === null) {
            if ("preset" in config.storyWorld) {
              const preset = getPresetById(config.storyWorld.preset);
              if (preset) {
                updates.storyWorld = preset;
              }
            } else {
              updates.storyWorld = {
                id: `custom-${Date.now()}`,
                name: config.storyWorld.name,
                description: config.storyWorld.description,
              };
            }
          }

          return updates;
        });
      },

      isSetupComplete: () => {
        const { profile, storyWorld, tasks } = get();
        return (
          profile.name.trim().length > 0 &&
          storyWorld !== null &&
          tasks.length > 0
        );
      },
    }),
    {
      name: "gtd-setup-store",
    },
  ),
);
