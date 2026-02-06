"use client";

import { useEffect, useRef } from "react";
import type { NarrativeEntry } from "@/types/story";
import { cn } from "@/lib/utils/cn";

interface NarrativeViewportProps {
  entries: NarrativeEntry[];
  streamingText?: string;
}

export function NarrativeViewport({
  entries,
  streamingText,
}: NarrativeViewportProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries, streamingText]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-6 space-y-4 scroll-smooth"
    >
      {entries.length === 0 && !streamingText && (
        <div className="text-gray-500 italic text-center py-12">
          Your adventure is about to begin...
        </div>
      )}

      {entries.map((entry) => (
        <NarrativeBlock key={entry.id} entry={entry} />
      ))}

      {streamingText && (
        <div className="narrative-text text-gray-200 leading-relaxed whitespace-pre-wrap">
          {streamingText}
          <span className="inline-block w-2 h-4 bg-amber-400 animate-pulse ml-0.5" />
        </div>
      )}
    </div>
  );
}

function NarrativeBlock({ entry }: { entry: NarrativeEntry }) {
  return (
    <div
      className={cn(
        "leading-relaxed whitespace-pre-wrap",
        entry.role === "narrator" && "narrative-text text-gray-200",
        entry.role === "player" &&
          "text-amber-300 pl-4 border-l-2 border-amber-500/30",
        entry.role === "system" &&
          "text-gray-500 italic text-sm text-center",
      )}
    >
      {entry.role === "player" && (
        <span className="text-amber-500/60 text-xs uppercase tracking-wider block mb-1">
          You
        </span>
      )}
      {entry.content}
      {entry.role === "narrator" && entry.rawData && (
        <details className="mt-2">
          <summary className="text-gray-600 text-xs cursor-pointer hover:text-gray-400 transition-colors">
            Raw JSON
          </summary>
          <pre className="mt-1 p-2 bg-gray-900/50 rounded text-gray-500 text-xs overflow-x-auto whitespace-pre-wrap break-all">
            {JSON.stringify(entry.rawData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
