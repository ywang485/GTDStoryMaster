"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSetupStore } from "@/stores/use-setup-store";
import { ProfileForm } from "@/components/setup/profile-form";
import { StoryWorldPicker } from "@/components/setup/storyworld-picker";
import { TaskEditor } from "@/components/setup/task-editor";
import { HydrationGate } from "@/components/providers/hydration-gate";
import { cn } from "@/lib/utils/cn";

const steps = [
  { id: "profile", label: "Adventurer", component: ProfileForm },
  { id: "world", label: "World", component: StoryWorldPicker },
  { id: "tasks", label: "Quests", component: TaskEditor },
] as const;

function SetupWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const { profile, storyWorld, tasks, isSetupComplete } = useSetupStore();

  const canProceed = () => {
    if (currentStep === 0) return profile.name.trim().length > 0;
    if (currentStep === 1) return storyWorld !== null;
    if (currentStep === 2) return tasks.length > 0 && tasks.some((t) => t.title.trim());
    return false;
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleBeginAdventure = () => {
    if (isSetupComplete()) {
      router.push("/setup/prepare");
    }
  };

  const StepComponent = steps[currentStep].component;

  return (
    <div className="min-h-screen flex flex-col bg-gray-950">
      {/* Header */}
      <header className="border-b border-gray-800 px-8 py-6">
        <h1 className="text-2xl font-bold text-amber-400 font-mono">
          GTD Story Master
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Turn your todo list into an epic adventure
        </p>
      </header>

      {/* Stepper */}
      <div className="px-8 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2 max-w-2xl">
          {steps.map((step, i) => (
            <div key={step.id} className="flex items-center gap-2">
              <button
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors",
                  i === currentStep
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : i < currentStep
                      ? "text-green-400 border border-green-500/20"
                      : "text-gray-500 border border-gray-800",
                )}
              >
                <span className="font-mono text-xs">
                  {i < currentStep ? "\u2713" : i + 1}
                </span>
                {step.label}
              </button>
              {i < steps.length - 1 && (
                <span className="text-gray-700">&mdash;</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <main className="flex-1 px-8 py-8 max-w-3xl">
        <StepComponent />
      </main>

      {/* Navigation */}
      <footer className="border-t border-gray-800 px-8 py-4 flex justify-between items-center">
        <button
          onClick={handleBack}
          disabled={currentStep === 0}
          className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          &larr; Back
        </button>

        <div className="flex gap-3">
          {currentStep < steps.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={!canProceed()}
              className="px-6 py-2 bg-amber-600 text-gray-950 font-medium rounded hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Next &rarr;
            </button>
          ) : (
            <button
              onClick={handleBeginAdventure}
              disabled={!isSetupComplete()}
              className="px-6 py-2 bg-amber-600 text-gray-950 font-bold rounded hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors glow-amber"
            >
              Begin Your Adventure
            </button>
          )}
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <HydrationGate>
      <SetupWizard />
    </HydrationGate>
  );
}
