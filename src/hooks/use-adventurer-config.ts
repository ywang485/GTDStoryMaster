"use client";

import { useEffect, useState } from "react";
import type { AdventurerConfig } from "@/types/config";

/**
 * Fetches adventurer.config.json via the API route on mount.
 * Returns the parsed config (or null while loading / on error).
 */
export function useAdventurerConfig() {
  const [config, setConfig] = useState<AdventurerConfig | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/config")
      .then((res) => res.json())
      .then((data: AdventurerConfig) => {
        setConfig(data);
        setLoaded(true);
      })
      .catch(() => {
        setConfig({});
        setLoaded(true);
      });
  }, []);

  return { config, loaded };
}
