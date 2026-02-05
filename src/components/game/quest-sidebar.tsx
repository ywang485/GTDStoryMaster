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
    <div className="w-72 border-l border-gray-800 bg-gray-950/50 flex flex-col">
      <div className="p-4 border-b border-gray-800">
        <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">
          Quest Log
        </h3>
        <div className="mt-2">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Progress</span>
            <span>
              {completedCount}/{totalCount}
            </span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>
      </div>

      {/*<div className="flex-1 overflow-y-auto p-4 space-y-3">
        {plotStructure ? (
          plotStructure.acts.map((act) => (
            <div key={act.actNumber}>
              <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Act {act.actNumber}: {act.title}
              </h4>
              <div className="space-y-2">
                {act.scenes.map((scene) => {
                  const isActive = scene.id === currentSceneId;
                  const isComplete = scene.associatedTaskIds.every((id) =>
                    completedSet.has(id),
                  );

                  return (
                    <div
                      key={scene.id}
                      className={cn(
                        "p-2 rounded text-sm border transition-all",
                        isActive &&
                          "border-amber-500/50 bg-amber-500/5 text-gray-200",
                        isComplete &&
                          !isActive &&
                          "border-green-500/20 bg-green-500/5 text-gray-500",
                        !isActive &&
                          !isComplete &&
                          "border-gray-800 text-gray-500",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <span>
                          {isComplete ? (
                            <span className="text-green-400">&#10003;</span>
                          ) : isActive ? (
                            <span className="text-amber-400">&#9679;</span>
                          ) : (
                            <span className="text-gray-600">&#9675;</span>
                          )}
                        </span>
                        <span className="font-medium">{scene.title}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="text-gray-600 text-sm italic">
            Quests will appear here once your adventure begins.
          </div>
        )}
      </div>*/}

      <div className="p-4 border-t border-gray-800">
        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
          Tasks
        </h4>
        <div className="space-y-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={cn(
                "text-xs flex items-center gap-2",
                completedSet.has(task.id) ? "text-gray-600 line-through" : "text-gray-400",
                task.status === "active" && "text-amber-300",
              )}
            >
              <span>
                {completedSet.has(task.id) ? (
                  <span className="text-green-400">&#10003;</span>
                ) : task.status === "active" ? (
                  <span className="text-amber-400">&#9654;</span>
                ) : (
                  <span className="text-gray-600">&#8226;</span>
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
