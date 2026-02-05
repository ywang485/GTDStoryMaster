"use client";

import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  activeModal: string | null;
  themeVariant: string;
  isStreaming: boolean;

  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  openModal: (id: string) => void;
  closeModal: () => void;
  setThemeVariant: (theme: string) => void;
  setIsStreaming: (streaming: boolean) => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarOpen: true,
  activeModal: null,
  themeVariant: "fantasy",
  isStreaming: false,

  toggleSidebar: () =>
    set((state) => ({ sidebarOpen: !state.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  openModal: (id) => set({ activeModal: id }),
  closeModal: () => set({ activeModal: null }),
  setThemeVariant: (theme) => set({ themeVariant: theme }),
  setIsStreaming: (streaming) => set({ isStreaming: streaming }),
}));
