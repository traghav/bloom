import type {
  LLMProvider,
  GenerateParams,
  GenerateResult,
  StreamChunk,
  ModelInfo,
} from '../types';
import { registerProvider, streamingFetch } from './base';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

const models: ModelInfo[] = [
  // Claude 4.5 Family (Latest)
  { id: 'claude-opus-4-5-20251124', name: 'Claude Opus 4.5', contextWindow: 200000 },
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', contextWindow: 200000 },
  { id: 'claude-haiku-4-5-20251201', name: 'Claude Haiku 4.5', contextWindow: 200000 },
  // Claude 4.1 Family
  { id: 'claude-opus-4-1-20250805', name: 'Claude Opus 4.1', contextWindow: 200000 },
  // Claude 4 Family
  { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', contextWindow: 200000 },
  { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', contextWindow: 200000 },
  // Claude 3.5 (Legacy but still available)
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', contextWindow: 200000 },
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', contextWindow: 200000 },
];

export const anthropicProvider: LLMProvider = {
  name: 'anthropic',
  displayName: 'Anthropic',
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
    const rawResponse: unknown = null;

    // Extract system message
    const systemMessage = params.messages.find((m) => m.role === 'system');
    const nonSystemMessages = params.messages.filter((m) => m.role !== 'system');

    // Handle continue vs respond mode
    const messages = params.mode === 'continue'
      ? [
          ...nonSystemMessages.slice(0, -1),
          {
            role: 'user' as const,
            content: `Continue writing from where this text ends. Do not repeat any of it, just continue naturally:\n\n${nonSystemMessages[nonSystemMessages.length - 1]?.content || ''}`,
          },
        ]
      : nonSystemMessages;

    // Convert to Anthropic format
    const anthropicMessages = messages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    }));

    const body: Record<string, unknown> = {
      model: params.model,
      messages: anthropicMessages,
      max_tokens: params.maxTokens,
      temperature: params.temperature,
      top_p: params.topP,
      stream: true,
    };

    if (systemMessage) {
      body.system = systemMessage.content;
    }

    const parseChunk = (line: string): StreamChunk | null => {
      if (!line.startsWith('data: ')) return null;
      const data = line.slice(6);

      try {
        const json = JSON.parse(data);

        if (json.type === 'content_block_delta') {
          const delta = json.delta?.text || '';
          fullText += delta;
          return { text: delta, done: false };
        }

        if (json.type === 'message_delta') {
          if (json.usage) {
            tokenUsage.completion = json.usage.output_tokens;
          }
        }

        if (json.type === 'message_start') {
          if (json.message?.usage) {
            tokenUsage.prompt = json.message.usage.input_tokens;
          }
        }

        if (json.type === 'message_stop') {
          return { text: '', done: true };
        }

        return null;
      } catch {
        return null;
      }
    };

    await streamingFetch(
      ANTHROPIC_API_URL,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
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
      rawResponse,
      latencyMs,
    };
  },

  async validateKey(apiKey: string): Promise<boolean> {
    try {
      // Simple validation by making a minimal request
      const response = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-20241022',
          messages: [{ role: 'user', content: 'Hi' }],
          max_tokens: 1,
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  },
};

// Register the provider
registerProvider(anthropicProvider);
