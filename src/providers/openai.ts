import type {
  LLMProvider,
  GenerateParams,
  GenerateResult,
  StreamChunk,
  ModelInfo,
} from '../types';
import { registerProvider, streamingFetch } from './base';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

const models: ModelInfo[] = [
  // GPT-5 Family (Latest)
  { id: 'gpt-5', name: 'GPT-5', contextWindow: 256000 },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini', contextWindow: 128000 },
  // GPT-4.1 Family
  { id: 'gpt-4.1', name: 'GPT-4.1', contextWindow: 1000000 },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini', contextWindow: 1000000 },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano', contextWindow: 1000000 },
  // o-Series Reasoning
  { id: 'o3', name: 'o3', contextWindow: 200000 },
  { id: 'o3-mini', name: 'o3 Mini', contextWindow: 200000 },
  { id: 'o4-mini', name: 'o4 Mini', contextWindow: 200000 },
  // GPT-4o (Legacy but still useful for audio)
  { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, supportsLogprobs: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, supportsLogprobs: true },
];

export const openaiProvider: LLMProvider = {
  name: 'openai',
  displayName: 'OpenAI',
  models,

  async generate(
    params: GenerateParams,
    apiKey: string,
    onChunk: (chunk: StreamChunk) => void,
    signal?: AbortSignal
  ): Promise<GenerateResult> {
    const startTime = Date.now();
    let fullText = '';
    let tokenUsage = { prompt: 0, completion: 0 };
    let logprobs: unknown = null;
    const rawResponse: unknown = null;

    // Handle continue vs respond mode
    const messages = params.mode === 'continue'
      ? [
          ...params.messages.slice(0, -1),
          {
            role: 'user' as const,
            content: `Continue writing from where this text ends. Do not repeat any of it, just continue naturally:\n\n${params.messages[params.messages.length - 1]?.content || ''}`,
          },
        ]
      : params.messages;

    // Check if model is o-series or gpt-5 (different parameters)
    const isReasoningModel = params.model.startsWith('o') || params.model.startsWith('gpt-5');

    const body: Record<string, unknown> = {
      model: params.model,
      messages,
      stream: true,
    };

    // Reasoning models don't support temperature/top_p
    if (!isReasoningModel) {
      body.temperature = params.temperature;
      body.max_tokens = params.maxTokens;
      body.top_p = params.topP;
    } else {
      body.max_completion_tokens = params.maxTokens;
    }

    const parseChunk = (line: string): StreamChunk | null => {
      if (!line.startsWith('data: ')) return null;
      const data = line.slice(6);
      if (data === '[DONE]') return { text: '', done: true };

      try {
        const json = JSON.parse(data);
        const delta = json.choices?.[0]?.delta?.content || '';
        const finishReason = json.choices?.[0]?.finish_reason;

        if (json.usage) {
          tokenUsage = {
            prompt: json.usage.prompt_tokens,
            completion: json.usage.completion_tokens,
          };
        }

        if (json.choices?.[0]?.logprobs) {
          logprobs = json.choices[0].logprobs;
        }

        fullText += delta;

        return {
          text: delta,
          done: finishReason === 'stop',
        };
      } catch {
        return null;
      }
    };

    await streamingFetch(
      OPENAI_API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(body),
      },
      parseChunk,
      onChunk,
      signal
    );

    const latencyMs = Date.now() - startTime;

    return {
      text: fullText,
      tokenUsage,
      logprobs,
      rawResponse,
      latencyMs,
    };
  },

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};

// Register the provider
registerProvider(openaiProvider);
