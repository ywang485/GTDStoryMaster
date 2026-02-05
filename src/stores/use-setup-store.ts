"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PlayerProfile } from "@/types/player";
import type { StoryWorld } from "@/types/storyworld";
import type { Task } from "@/types/task";

interface SetupState {
  profile: PlayerProfile;
  storyWorld: StoryWorld | null;
  tasks: Task[];

  setProfile: (profile: Partial<PlayerProfile>) => void;
  setStoryWorld: (world: StoryWorld) => void;
  addTask: (task: Task) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  reorderTasks: (fromIndex: number, toIndex: number) => void;
  setTasks: (tasks: Task[]) => void;
  resetSetup: () => void;
  isSetupComplete: () => boolean;
}

const defaultProfile: PlayerProfile = {
  name: "",
  gender: "",
  age: 25,
  personality: "",
  hobbies: [],
  coreValues: [],
  beliefSystems: [],
};

export const useSetupStore = create<SetupState>()(
  persist(
    (set, get) => ({
      profile: defaultProfile,
      storyWorld: null,
      tasks: [],

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
          // Also remove from dependencies
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
        }),

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
