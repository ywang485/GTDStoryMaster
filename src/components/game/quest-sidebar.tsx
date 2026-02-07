"use client";

import type { Task } from "@/types/task";
import type { PlotStructure } from "@/types/story";
import { cn } from "@/lib/utils/cn";

interface QuestSidebarProps {
  tasks: Task[];
  completedTaskIds: string[];
  plotStructure: PlotStructure | null;
  currentSceneId: string | null;
}

export function QuestSidebar({
  tasks,
  completedTaskIds,
  plotStructure,
  currentSceneId,
}: QuestSidebarProps) {
  const completedSet = new Set(completedTaskIds);
  const completedCount = completedTaskIds.length;
  const totalCount = tasks.length;
  const percentage =
    totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);

  return (
    <div className="w-64 border-l border-gray-200 bg-white flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-xs text-gray-400 uppercase tracking-widest">
          Tasks
        </h3>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-400 mb-1 font-mono">
            <span>Progress</span>
            <span>
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="h-px bg-gray-200 overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="p-4">
        <div className="space-y-1.5">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "text-xs flex items-center gap-2 font-light",
                completedSet.has(task.id) ? "text-gray-300 line-through" : "text-gray-600",
                task.status === "active" && "text-black font-normal",
              )}
            >
              <span className={cn(
                "font-mono",
                completedSet.has(task.id) ? "text-black" : "text-gray-400",
              )}>
                {completedSet.has(task.id) ? (
                  "\u2713"
                ) : task.status === "active" ? (
                  "\u203A"
                ) : (
                  "\u00B7"
                )}
              </span>
              {task.title}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
