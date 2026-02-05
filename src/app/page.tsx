"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSetupStore } from "@/stores/use-setup-store";
import { useAdventurerConfig } from "@/hooks/use-adventurer-config";
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
  const { config, loaded: configLoaded } = useAdventurerConfig();
  const {
    profile,
    storyWorld,
    tasks,
    isSetupComplete,
    configApplied,
    applyConfig,
  } = useSetupStore();

  // Apply config file values once on first load
  useEffect(() => {
    if (configLoaded && config && !configApplied) {
      applyConfig(config);
    }
  }, [configLoaded, config, configApplied, applyConfig]);

  // Determine which steps are pre-filled from config
  const profileFromConfig =
    configApplied && config?.profile && profile.name.trim().length > 0;
  const worldFromConfig = configApplied && config?.storyWorld && storyWorld !== null;

  // Start on the first step that isn't pre-filled, or the last step (tasks)
  const initialStep = profileFromConfig && worldFromConfig ? 2 : profileFromConfig ? 1 : 0;
  const [currentStep, setCurrentStep] = useState<number | null>(null);

  // Set initial step once config is applied
  useEffect(() => {
    if (configApplied && currentStep === null) {
      setCurrentStep(initialStep);
    }
  }, [configApplied, currentStep, initialStep]);

  // Before config loads, default to step 0
  const step = currentStep ?? 0;

  const canProceed = () => {
    if (step === 0) return profile.name.trim().length > 0;
    if (step === 1) return storyWorld !== null;
    if (step === 2)
      return tasks.length > 0 && tasks.some((t) => t.title.trim());
    return false;
  };

  const handleNext = () => {
    if (step < steps.length - 1) {
      setCurrentStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 0) {
      setCurrentStep(step - 1);
    }
  };

  const handleBeginAdventure = () => {
    if (isSetupComplete()) {
      if (typeof window !== "undefined") {
        localStorage.clear();
      }
      router.push("/setup/prepare");
    }
  };

  const StepComponent = steps[step].component;

  // Determine which steps are "done" (pre-filled or user-completed)
  const isStepDone = (i: number) => {
    if (i === 0) return profile.name.trim().length > 0;
    if (i === 1) return storyWorld !== null;
    return false;
  };

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

      {/* Config banner */}
      {configApplied && (profileFromConfig || worldFromConfig) && (
        <div className="px-8 py-2 bg-amber-500/5 border-b border-amber-500/20 flex items-center gap-2 text-sm text-amber-400/80">
          <span>Loaded from adventurer.config.json:</span>
          {profileFromConfig && (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-xs">
              Profile
            </span>
          )}
          {worldFromConfig && (
            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-xs">
              World
            </span>
          )}
          <span className="text-gray-500 text-xs ml-2">
            (you can still edit these in their steps)
          </span>
        </div>
      )}

      {/* Stepper */}
      <div className="px-8 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2 max-w-2xl">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              <button
                onClick={() => setCurrentStep(i)}
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors",
                  i === step
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                    : isStepDone(i)
                      ? "text-green-400 border border-green-500/20"
                      : "text-gray-500 border border-gray-800",
                )}
              >
                <span className="font-mono text-xs">
                  {isStepDone(i) && i !== step ? "\u2713" : i + 1}
                </span>
                {s.label}
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
          disabled={step === 0}
          className="px-4 py-2 text-sm text-gray-400 hover:text-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          &larr; Back
        </button>

        <div className="flex gap-3">
          {step < steps.length - 1 ? (
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
