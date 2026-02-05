export type AIProviderName = "openai" | "anthropic" | "google";

export interface AIConfig {
  provider: AIProviderName;
  model: string;
  fastModel: string;
  temperature?: number;
  maxTokens?: number;
}
