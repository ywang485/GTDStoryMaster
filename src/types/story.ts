export interface PlotStructure {
  title: string;
  premise: string;
  acts: Act[];
}

export interface Act {
  actNumber: number;
  title: string;
  description: string;
  scenes: Scene[];
}

export interface Scene {
  id: string;
  title: string;
  description: string;
  associatedTaskIds: string[];
  metaphor: string;
  narrativeHook: string;
  suggestedChoices: string[];
  transitionHint: string;
}

export interface NarrativeEntry {
  id: string;
  role: "narrator" | "player" | "system";
  content: string;
  timestamp: number;
  sceneId: string;
  productivityObservation?: string;
  explanation?: string;
  rawData?: Record<string, unknown>;
}
