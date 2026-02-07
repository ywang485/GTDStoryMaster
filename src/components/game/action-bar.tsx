"use client";

import { useState, useEffect, type FormEvent } from "react";
import type { Task } from "@/types/task";
import { cn } from "@/lib/utils/cn";

interface ActionBarProps {
  activeTask: Task | null;
  isStreaming: boolean;
  onAction: (type: string, content: string, taskId?: string) => void;
  exampleResponses?: string[];
  pendingInput?: string;
  onPendingInputConsumed?: () => void;
}

export function ActionBar({
  activeTask,
  isStreaming,
  onAction,
  exampleResponses,
  pendingInput,
  onPendingInputConsumed,
}: ActionBarProps) {
  const [input, setInput] = useState("");

  // Prefill input from external sources (e.g. execution popup postMessage)
  useEffect(() => {
    if (pendingInput) {
      setInput(pendingInput);
      onPendingInputConsumed?.();
    }
  }, [pendingInput, onPendingInputConsumed]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onAction("freetext", input.trim());
    setInput("");
  };

  const handleChoice = (choice: string) => {
    if (isStreaming) return;
    onAction("choice", choice);
    setInput("");
  };

  const handleTaskComplete = () => {
    if (!activeTask || isStreaming) return;
    onAction("complete_task", `I've completed: ${activeTask.title}`, activeTask.id);
    setInput("");
  };

  const handleTaskSkip = () => {
    if (!activeTask || isStreaming) return;
    onAction("skip_task", `Skipping: ${activeTask.title}`, activeTask.id);
    setInput("");
  };

  return (
    <div className="border-t border-gray-200 bg-white px-8 py-4 space-y-3 max-w-3xl mx-auto w-full">
      {activeTask && (
        <div className="flex items-center gap-3 py-2">
          <div className="flex-1">
            <span className="text-xs text-gray-400 uppercase tracking-widest">
              Current Task
            </span>
            <p className="text-sm text-black font-light">
              {activeTask.title}
            </p>
          </div>
          <button
            onClick={handleTaskComplete}
            disabled={isStreaming}
            className="px-3 py-1.5 bg-black text-white text-xs rounded-none hover:bg-gray-800 disabled:opacity-30 transition-colors tracking-wide"
          >
            Complete
          </button>
          <button
            onClick={handleTaskSkip}
            disabled={isStreaming}
            className="px-3 py-1.5 border border-gray-300 text-gray-500 text-xs rounded-none hover:border-gray-500 disabled:opacity-30 transition-colors tracking-wide"
          >
            Skip
          </button>
        </div>
      )}

      {exampleResponses && exampleResponses.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {exampleResponses.map((response, i) => (
            <button
              key={i}
              onClick={() => handleChoice(response)}
              disabled={isStreaming}
              className={cn(
                "px-3 py-1.5 text-xs rounded-none border transition-colors",
                isStreaming
                  ? "border-gray-200 text-gray-300 cursor-not-allowed"
                  : "border-gray-300 text-gray-500 hover:border-gray-500 hover:text-black",
              )}
            >
              {response}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-center">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isStreaming
              ? "..."
              : "Type here"
          }
          disabled={isStreaming}
          className="flex-1 bg-transparent border-none text-black placeholder:text-gray-300 focus:outline-none font-light"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="px-4 py-1.5 bg-black text-white text-xs rounded-none hover:bg-gray-800 disabled:opacity-20 disabled:cursor-not-allowed transition-colors tracking-wide"
        >
          Send
        </button>
      </form>
    </div>
  );
}
