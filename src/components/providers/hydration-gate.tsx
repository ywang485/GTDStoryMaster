"use client";

import { useHydrated } from "@/hooks/use-hydrated";

export function HydrationGate({ children }: { children: React.ReactNode }) {
  const hydrated = useHydrated();

  if (!hydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950">
        <div className="text-amber-400/60 font-mono text-sm animate-pulse">
          Initializing story engine...
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
