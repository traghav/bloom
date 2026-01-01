import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { GenerationParams, GenerationMode, ProviderName } from '../types';
import { DEFAULT_GENERATION_PARAMS } from '../types';

interface SettingsStore {
  // API Keys
  apiKeys: Record<ProviderName, string>;
  setApiKey: (provider: ProviderName, key: string) => void;
  getApiKey: (provider: ProviderName) => string;

  // Current provider/model
  currentProvider: ProviderName;
  currentModel: string;
  setProvider: (provider: ProviderName) => void;
  setModel: (model: string) => void;

  // Generation settings
  generationParams: GenerationParams;
  setGenerationParams: (params: Partial<GenerationParams>) => void;

  // Generation mode
  generationMode: GenerationMode;
  setGenerationMode: (mode: GenerationMode) => void;

  // System prompt
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;

  // Settings modal
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      // API Keys (stored in localStorage via persist)
      apiKeys: {
        openai: '',
        anthropic: '',
        gemini: '',
      },

      setApiKey: (provider, key) => {
        set((state) => ({
          apiKeys: { ...state.apiKeys, [provider]: key },
        }));
      },

      getApiKey: (provider) => get().apiKeys[provider],

      // Provider/Model
      currentProvider: 'openai',
      currentModel: 'gpt-4.1-mini',

      setProvider: (provider) => {
        // Set default model for provider
        const defaultModels: Record<ProviderName, string> = {
          openai: 'gpt-4.1-mini',
          anthropic: 'claude-sonnet-4-5-20250929',
          gemini: 'gemini-2.5-flash',
        };
        set({
          currentProvider: provider,
          currentModel: defaultModels[provider],
        });
      },

      setModel: (model) => set({ currentModel: model }),

      // Generation params
      generationParams: DEFAULT_GENERATION_PARAMS,

      setGenerationParams: (params) => {
        set((state) => ({
          generationParams: { ...state.generationParams, ...params },
        }));
      },

      // Generation mode
      generationMode: 'continue',
      setGenerationMode: (mode) => set({ generationMode: mode }),

      // System prompt
      systemPrompt: '',
      setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),

      // Settings modal
      isSettingsOpen: false,
      openSettings: () => set({ isSettingsOpen: true }),
      closeSettings: () => set({ isSettingsOpen: false }),
    }),
    {
      name: 'bloom-settings',
      partialize: (state) => ({
        apiKeys: state.apiKeys,
        currentProvider: state.currentProvider,
        currentModel: state.currentModel,
        generationParams: state.generationParams,
        generationMode: state.generationMode,
        systemPrompt: state.systemPrompt,
      }),
    }
  )
);
