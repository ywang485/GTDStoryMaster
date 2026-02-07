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
      className="flex-1 overflow-y-auto px-8 py-6 space-y-6 scroll-smooth max-w-3xl mx-auto w-full"
    >
      {entries.length === 0 && !streamingText && (
        <div className="text-gray-400 italic text-center py-12 font-light">
          Your adventure is about to begin...
        </div>
      )}

      {entries.map((entry) => (
        <NarrativeBlock key={entry.id} entry={entry} />
      ))}

      {streamingText && (
        <div className="text-black leading-loose whitespace-pre-wrap font-light">
          {streamingText}
          <span className="inline-block w-1.5 h-4 bg-black animate-pulse ml-0.5" />
        </div>
      )}
    </div>
  );
}

function NarrativeBlock({ entry }: { entry: NarrativeEntry }) {
  return (
    <div
      className={cn(
        "leading-loose whitespace-pre-wrap",
        entry.role === "narrator" && "text-black font-light",
        entry.role === "player" &&
          "text-gray-500 pl-4 border-l border-gray-300",
        entry.role === "system" &&
          "text-gray-400 italic text-sm text-center",
      )}
    >
      {entry.role === "player" && (
        <span className="text-gray-400 text-xs uppercase tracking-widest block mb-1 font-normal">
          You
        </span>
      )}
      {entry.content}
      {entry.role === "narrator" && entry.rawData && (
        <details className="mt-2">
          <summary className="text-gray-400 text-xs cursor-pointer hover:text-gray-600 transition-colors font-mono">
            Raw JSON
          </summary>
          <pre className="mt-1 p-3 bg-gray-50 rounded text-gray-400 text-xs overflow-x-auto whitespace-pre-wrap break-all font-mono">
            {JSON.stringify(entry.rawData, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}
