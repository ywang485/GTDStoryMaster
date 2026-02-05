"use client";

import { useState, type FormEvent } from "react";
import type { Scene } from "@/types/story";
import type { Task } from "@/types/task";
import { cn } from "@/lib/utils/cn";

interface ActionBarProps {
  currentScene: Scene | null;
  activeTask: Task | null;
  isStreaming: boolean;
  onAction: (type: string, content: string, taskId?: string) => void;
}

export function ActionBar({
  currentScene,
  activeTask,
  isStreaming,
  onAction,
}: ActionBarProps) {
  const [input, setInput] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    onAction("freetext", input.trim());
    setInput("");
  };

  const handleChoice = (choice: string) => {
    if (isStreaming) return;
    onAction("choice", choice);
  };

  const handleTaskComplete = () => {
    if (!activeTask || isStreaming) return;
    onAction("complete_task", `I've completed: ${activeTask.title}`, activeTask.id);
  };

  const handleTaskSkip = () => {
    if (!activeTask || isStreaming) return;
    onAction("skip_task", `Skipping: ${activeTask.title}`, activeTask.id);
  };

  return (
    <div className="border-t border-gray-800 bg-gray-950/80 p-4 space-y-3">
      {activeTask && (
        <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-700 bg-gray-900">
          <div className="flex-1">
            <span className="text-xs text-amber-400 uppercase tracking-wider">
              Current Quest
            </span>
            <p className="text-sm text-gray-200 font-medium">
              {activeTask.title}
            </p>
          </div>
          <button
            onClick={handleTaskComplete}
            disabled={isStreaming}
            className="px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-500 disabled:opacity-40 transition-colors"
          >
            Complete
          </button>
          <button
            onClick={handleTaskSkip}
            disabled={isStreaming}
            className="px-3 py-1.5 border border-gray-600 text-gray-400 text-sm rounded hover:border-gray-400 disabled:opacity-40 transition-colors"
          >
            Skip
          </button>
        </div>
      )}

      {currentScene && currentScene.suggestedChoices.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {currentScene.suggestedChoices.map((choice, i) => (
            <button
              key={i}
              onClick={() => handleChoice(choice)}
              disabled={isStreaming}
              className={cn(
                "px-3 py-1.5 text-sm rounded border transition-colors",
                isStreaming
                  ? "border-gray-800 text-gray-600 cursor-not-allowed"
                  : "border-gray-600 text-gray-300 hover:border-amber-500 hover:text-amber-400",
              )}
            >
              {choice}
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <span className="text-amber-500 self-center font-mono">&gt;</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isStreaming
              ? "The story master is speaking..."
              : "What do you do? (type freely or use the buttons above)"
          }
          disabled={isStreaming}
          className="flex-1 bg-transparent border-none text-gray-100 placeholder:text-gray-600 focus:outline-none font-mono"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="px-4 py-1.5 bg-amber-600 text-gray-950 font-medium rounded hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
        >
          Send
        </button>
      </form>
    </div>
  );
}
