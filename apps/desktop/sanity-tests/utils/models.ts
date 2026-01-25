// apps/desktop/sanity-tests/utils/models.ts
import type { ProviderId } from '@accomplish/shared';

export interface SanityModel {
  provider: ProviderId;
  modelId: string;
  displayName: string;
  envKeyName: string;
}

export const SANITY_MODELS: SanityModel[] = [
  {
    provider: 'anthropic',
    modelId: 'anthropic/claude-opus-4-5',
    displayName: 'Claude Opus 4.5',
    envKeyName: 'ANTHROPIC_API_KEY',
  },
  {
    provider: 'openai',
    modelId: 'openai/gpt-5-codex',
    displayName: 'GPT-5 Codex',
    envKeyName: 'OPENAI_API_KEY',
  },
  {
    provider: 'google',
    modelId: 'google/gemini-3-pro-preview',
    displayName: 'Gemini 3 Pro',
    envKeyName: 'GOOGLE_API_KEY',
  },
];

/**
 * Get models to test based on MODEL_FILTER env var.
 * If MODEL_FILTER is set, only return models matching that provider.
 */
export function getModelsToTest(): SanityModel[] {
  const filter = process.env.MODEL_FILTER;
  if (!filter) return SANITY_MODELS;

  return SANITY_MODELS.filter((m) => m.provider === filter);
}

/**
 * Get API key from environment for a model.
 * Throws if key is missing.
 */
export function getApiKeyForModel(model: SanityModel): string {
  const key = process.env[model.envKeyName];
  if (!key) {
    throw new Error(
      `Missing ${model.envKeyName} environment variable for ${model.displayName}`
    );
  }
  return key;
}

/**
 * Validate all required API keys exist before tests run.
 */
export function validateApiKeys(): void {
  const models = getModelsToTest();
  const missing: string[] = [];

  for (const model of models) {
    if (!process.env[model.envKeyName]) {
      missing.push(model.envKeyName);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required API keys: ${missing.join(', ')}`);
  }
}
