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
  { id: 'gpt-4o', name: 'GPT-4o', contextWindow: 128000, supportsLogprobs: true },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextWindow: 128000, supportsLogprobs: true },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextWindow: 128000, supportsLogprobs: true },
  { id: 'gpt-4', name: 'GPT-4', contextWindow: 8192, supportsLogprobs: true },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', contextWindow: 16385, supportsLogprobs: true },
  { id: 'o1', name: 'o1', contextWindow: 200000 },
  { id: 'o1-mini', name: 'o1 Mini', contextWindow: 128000 },
  { id: 'o1-preview', name: 'o1 Preview', contextWindow: 128000 },
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
    let rawResponse: unknown = null;

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

    // Check if model is o1 series (different parameters)
    const isO1 = params.model.startsWith('o1');

    const body: Record<string, unknown> = {
      model: params.model,
      messages,
      stream: true,
    };

    // o1 models don't support temperature/top_p
    if (!isO1) {
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
