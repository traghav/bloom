import type {
  LLMProvider,
  GenerateParams,
  GenerateResult,
  StreamChunk,
  ModelInfo,
} from '../types';
import { registerProvider } from './base';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

const models: ModelInfo[] = [
  // Gemini 2.5 Family (Latest)
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextWindow: 1000000 },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextWindow: 1000000 },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', contextWindow: 1000000 },
  // Gemini 2.0 Family
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextWindow: 1000000 },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite', contextWindow: 1000000 },
  // Gemini 3 Preview (if available)
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)', contextWindow: 1000000 },
  { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash (Preview)', contextWindow: 1000000 },
];

export const geminiProvider: LLMProvider = {
  name: 'gemini',
  displayName: 'Google Gemini',
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

    // Convert to Gemini format
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {
        temperature: params.temperature,
        maxOutputTokens: params.maxTokens,
        topP: params.topP,
      },
    };

    if (systemMessage) {
      body.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    const url = `${GEMINI_API_URL}/${params.model}:streamGenerateContent?key=${apiKey}&alt=sse`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API Error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        try {
          const json = JSON.parse(data);

          if (json.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = json.candidates[0].content.parts[0].text;
            fullText += text;
            onChunk({ text, done: false });
          }

          if (json.usageMetadata) {
            tokenUsage = {
              prompt: json.usageMetadata.promptTokenCount || 0,
              completion: json.usageMetadata.candidatesTokenCount || 0,
            };
          }

          if (json.candidates?.[0]?.finishReason === 'STOP') {
            onChunk({ text: '', done: true });
          }
        } catch {
          // Ignore parse errors
        }
      }
    }

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
      const response = await fetch(
        `${GEMINI_API_URL}?key=${apiKey}`
      );
      return response.ok;
    } catch {
      return false;
    }
  },
};

// Register the provider
registerProvider(geminiProvider);
