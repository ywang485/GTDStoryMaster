import { openai } from "@ai-sdk/openai";
import { anthropic } from "@ai-sdk/anthropic";
import { google } from "@ai-sdk/google";
import { aiConfig } from "@/config/ai";
import type { AIProviderName } from "@/types/ai";

const providers: Record<AIProviderName, (modelId: string) => ReturnType<typeof openai>> = {
  openai: (modelId: string) => openai(modelId),
  anthropic: (modelId: string) => anthropic(modelId) as ReturnType<typeof openai>,
  google: (modelId: string) => google(modelId) as ReturnType<typeof openai>,
};

/**
 * Returns the configured model for creative narration (higher temperature).
 */
export function getNarrationModel() {
  return providers[aiConfig.provider](aiConfig.model);
}

/**
 * Returns the configured model for structured output (lower temperature).
 */
export function getStructuredModel() {
  return providers[aiConfig.provider](aiConfig.model);
}

/**
 * Returns a fast model for quick classifications.
 */
export function getFastModel() {
  return providers[aiConfig.provider](aiConfig.fastModel);
}
