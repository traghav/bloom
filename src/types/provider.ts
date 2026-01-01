import type { GenerationMode, GenerationParams, TokenUsage } from './node';

export type ProviderName = 'openai' | 'anthropic' | 'gemini';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface GenerateParams {
  messages: Message[];
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  mode: GenerationMode;
}

export interface GenerateResult {
  text: string;
  tokenUsage?: TokenUsage;
  logprobs?: unknown;
  rawResponse?: unknown;
  latencyMs: number;
}

export interface StreamChunk {
  text: string;
  done: boolean;
  result?: GenerateResult;
}

export interface LLMProvider {
  name: ProviderName;
  displayName: string;
  models: ModelInfo[];
  generate(
    params: GenerateParams,
    apiKey: string,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<GenerateResult>;
  validateKey(apiKey: string): Promise<boolean>;
}

export interface ModelInfo {
  id: string;
  name: string;
  contextWindow: number;
  supportsLogprobs?: boolean;
}

export interface ProviderConfig {
  apiKey: string;
  enabled: boolean;
}

export interface ProvidersConfig {
  openai: ProviderConfig;
  anthropic: ProviderConfig;
  gemini: ProviderConfig;
}

// Default generation params
export const DEFAULT_GENERATION_PARAMS: GenerationParams = {
  temperature: 0.7,
  maxTokens: 1024,
  topP: 1,
};

// Default providers config
export const DEFAULT_PROVIDERS_CONFIG: ProvidersConfig = {
  openai: { apiKey: '', enabled: false },
  anthropic: { apiKey: '', enabled: false },
  gemini: { apiKey: '', enabled: false },
};
