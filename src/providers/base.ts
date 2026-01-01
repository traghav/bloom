import type {
  LLMProvider,
  GenerateParams,
  StreamChunk,
  ModelInfo,
  ProviderName,
} from '../types';

// Registry of all providers
const providers: Map<ProviderName, LLMProvider> = new Map();

export function registerProvider(provider: LLMProvider): void {
  providers.set(provider.name, provider);
}

export function getProvider(name: ProviderName): LLMProvider | undefined {
  return providers.get(name);
}

export function getAllProviders(): LLMProvider[] {
  return Array.from(providers.values());
}

export function getAvailableModels(providerName: ProviderName): ModelInfo[] {
  const provider = providers.get(providerName);
  return provider?.models ?? [];
}

// Helper to build messages for generation
export function buildMessages(
  params: GenerateParams,
  systemPrompt?: string
): GenerateParams['messages'] {
  const messages = [...params.messages];

  // Add system prompt at the beginning if provided
  if (systemPrompt && !messages.some((m) => m.role === 'system')) {
    messages.unshift({ role: 'system', content: systemPrompt });
  }

  return messages;
}

// Shared streaming fetch helper
export async function streamingFetch(
  url: string,
  options: RequestInit,
  parseChunk: (line: string) => StreamChunk | null,
  onChunk: (chunk: StreamChunk) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(url, { ...options, signal });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API Error: ${response.status} - ${error}`);
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
      if (!trimmed || trimmed === 'data: [DONE]') continue;

      const chunk = parseChunk(trimmed);
      if (chunk) {
        onChunk(chunk);
      }
    }
  }
}
