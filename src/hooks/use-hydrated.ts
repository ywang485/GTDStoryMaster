"use client";

import { useState, useEffect } from "react";

/**
 * Returns true after the first client render, preventing hydration mismatches
 * when reading from persisted Zustand stores.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
