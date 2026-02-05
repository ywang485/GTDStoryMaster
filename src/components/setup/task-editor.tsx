"use client";

import { useState } from "react";
import { useSetupStore } from "@/stores/use-setup-store";
import type { Task, TaskPriority } from "@/types/task";

function generateId() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function TaskEditor() {
  const { tasks, addTask, updateTask, removeTask } = useSetupStore();
  const [bulkInput, setBulkInput] = useState("");
  const [showBulk, setShowBulk] = useState(false);

  const handleAddTask = () => {
    addTask({
      id: generateId(),
      title: "",
      priority: "medium",
      dependencies: [],
      status: "pending",
    });
  };

  const handleBulkAdd = () => {
    const lines = bulkInput
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    for (const line of lines) {
      addTask({
        id: generateId(),
        title: line.replace(/^[-*\d.)\s]+/, ""),
        priority: "medium",
        dependencies: [],
        status: "pending",
      });
    }
    setBulkInput("");
    setShowBulk(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-amber-400 mb-1">
          Your Quests for Today
        </h2>
        <p className="text-gray-400 text-sm">
          Add the tasks you need to accomplish. The Story Master will optimize
          their order and weave them into your adventure.
        </p>
      </div>

      {tasks.length > 0 && (
        <div className="space-y-3">
          {tasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              index={index}
              allTasks={tasks}
              onUpdate={(updates) => updateTask(task.id, updates)}
              onRemove={() => removeTask(task.id)}
            />
          ))}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleAddTask}
          className="px-4 py-2 border border-gray-600 text-gray-300 rounded hover:border-amber-500 hover:text-amber-400 transition-colors text-sm"
        >
          + Add Task
        </button>
        <button
          onClick={() => setShowBulk(!showBulk)}
          className="px-4 py-2 border border-gray-600 text-gray-300 rounded hover:border-amber-500 hover:text-amber-400 transition-colors text-sm"
        >
          Paste Multiple
        </button>
      </div>

      {showBulk && (
        <div className="space-y-3 p-4 border border-gray-700 rounded-lg bg-gray-900">
          <label className="block text-sm text-gray-300">
            Paste your task list (one per line)
          </label>
          <textarea
            value={bulkInput}
            onChange={(e) => setBulkInput(e.target.value)}
            placeholder={"Write project report\nReview pull requests\nEmail client updates\nClean up test suite"}
            rows={6}
            className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none resize-none font-mono text-sm"
          />
          <button
            onClick={handleBulkAdd}
            disabled={!bulkInput.trim()}
            className="px-4 py-2 bg-amber-600 text-gray-950 font-medium rounded hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Add All
          </button>
        </div>
      )}

      {tasks.length === 0 && (
        <div className="text-center py-8 text-gray-500 border border-dashed border-gray-700 rounded-lg">
          No tasks yet. Add tasks to begin your adventure.
        </div>
      )}
    </div>
  );
}

function TaskRow({
  task,
  index,
  allTasks,
  onUpdate,
  onRemove,
}: {
  task: Task;
  index: number;
  allTasks: Task[];
  onUpdate: (updates: Partial<Task>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-900 p-3 space-y-3">
      <div className="flex items-center gap-3">
        <span className="text-gray-500 text-sm font-mono w-6 text-right">
          {index + 1}.
        </span>
        <input
          type="text"
          value={task.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="What needs to be done?"
          className="flex-1 bg-transparent border-none text-gray-100 placeholder:text-gray-600 focus:outline-none"
        />
        <select
          value={task.priority}
          onChange={(e) =>
            onUpdate({ priority: e.target.value as TaskPriority })
          }
          className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-xs text-gray-300"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-300 text-sm"
        >
          {expanded ? "Less" : "More"}
        </button>
        <button
          onClick={onRemove}
          className="text-gray-500 hover:text-red-400 transition-colors"
        >
          &times;
        </button>
      </div>

      {expanded && (
        <div className="pl-9 space-y-3">
          <div className="space-y-2">
            <label className="block text-xs text-gray-400">Description</label>
            <textarea
              value={task.description || ""}
              onChange={(e) => onUpdate({ description: e.target.value })}
              placeholder="Optional details about this task..."
              rows={2}
              className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-2 text-sm text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="block text-xs text-gray-400">
                Est. minutes
              </label>
              <input
                type="number"
                value={task.estimatedMinutes ?? ""}
                onChange={(e) =>
                  onUpdate({
                    estimatedMinutes: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                placeholder="30"
                min={1}
                className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-gray-400">
                Aversiveness (1-10)
              </label>
              <input
                type="number"
                value={task.aversiveness ?? ""}
                onChange={(e) =>
                  onUpdate({
                    aversiveness: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                min={1}
                max={10}
                className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-gray-400">
                Cognitive Load (1-10)
              </label>
              <input
                type="number"
                value={task.cognitiveLoad ?? ""}
                onChange={(e) =>
                  onUpdate({
                    cognitiveLoad: e.target.value
                      ? parseInt(e.target.value)
                      : undefined,
                  })
                }
                min={1}
                max={10}
                className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-gray-400">
              Depends on (select tasks that must be done first)
            </label>
            <div className="flex flex-wrap gap-2">
              {allTasks
                .filter((t) => t.id !== task.id)
                .map((t) => (
                  <label
                    key={t.id}
                    className="flex items-center gap-1 text-xs text-gray-400"
                  >
                    <input
                      type="checkbox"
                      checked={task.dependencies.includes(t.id)}
                      onChange={(e) => {
                        const deps = e.target.checked
                          ? [...task.dependencies, t.id]
                          : task.dependencies.filter((d) => d !== t.id);
                        onUpdate({ dependencies: deps });
                      }}
                      className="rounded border-gray-600"
                    />
                    {t.title || `Task ${allTasks.indexOf(t) + 1}`}
                  </label>
                ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs text-gray-400">Category</label>
            <input
              type="text"
              value={task.category ?? ""}
              onChange={(e) => onUpdate({ category: e.target.value })}
              placeholder="e.g., coding, writing, admin"
              className="w-full bg-gray-950 border border-gray-700 rounded px-2 py-1 text-sm text-gray-100 placeholder:text-gray-600 focus:border-amber-500 focus:outline-none"
            />
          </div>
        </div>
      )}
    </div>
  );
}
