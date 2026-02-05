import type { AIProviderName } from "@/types/ai";

export const aiConfig = {
  provider: (process.env.AI_PROVIDER ?? "openai") as AIProviderName,
  model: process.env.AI_MODEL ?? "gpt-4o",
  fastModel: process.env.AI_MODEL_FAST ?? "gpt-4o-mini",
  narrationTemperature: 0.85,
  structuredTemperature: 0.4,
};
