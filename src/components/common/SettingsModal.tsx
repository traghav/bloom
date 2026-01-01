import { useState } from 'react';
import { useSettingsStore } from '../../stores';
import { getAllProviders, getAvailableModels } from '../../providers';
import type { ProviderName } from '../../types';

export function SettingsModal() {
  const {
    isSettingsOpen,
    closeSettings,
    apiKeys,
    setApiKey,
    currentProvider,
    currentModel,
    setProvider,
    setModel,
    generationParams,
    setGenerationParams,
    systemPrompt,
    setSystemPrompt,
  } = useSettingsStore();

  const [activeTab, setActiveTab] = useState<'api' | 'generation' | 'system'>('api');

  if (!isSettingsOpen) return null;

  const providers = getAllProviders();
  const models = getAvailableModels(currentProvider);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] w-full max-w-lg max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <h2 className="text-sm font-medium">Settings</h2>
          <button
            onClick={closeSettings}
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--color-border)]">
          {(['api', 'generation', 'system'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`
                px-4 py-2 text-xs font-medium transition-colors
                ${activeTab === tab
                  ? 'border-b-2 border-[var(--color-accent)] text-[var(--color-text)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                }
              `}
            >
              {tab === 'api' && 'API Keys'}
              {tab === 'generation' && 'Generation'}
              {tab === 'system' && 'System Prompt'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'api' && (
            <div className="space-y-4">
              {/* Provider selection */}
              <div>
                <label className="block text-xs font-medium mb-1">Provider</label>
                <select
                  value={currentProvider}
                  onChange={(e) => setProvider(e.target.value as ProviderName)}
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] bg-white focus:border-[var(--color-accent)] focus:outline-none"
                >
                  {providers.map((p) => (
                    <option key={p.name} value={p.name}>
                      {p.displayName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model selection */}
              <div>
                <label className="block text-xs font-medium mb-1">Model</label>
                <select
                  value={currentModel}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[var(--color-border)] bg-white focus:border-[var(--color-accent)] focus:outline-none"
                >
                  {models.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({Math.round(m.contextWindow / 1000)}k context)
                    </option>
                  ))}
                </select>
              </div>

              {/* API Keys */}
              <div className="pt-4 border-t border-[var(--color-border)]">
                <h3 className="text-xs font-medium mb-3">API Keys</h3>
                <div className="space-y-3">
                  {providers.map((p) => (
                    <div key={p.name}>
                      <label className="block text-xs mb-1 text-[var(--color-text-muted)]">
                        {p.displayName}
                      </label>
                      <input
                        type="password"
                        value={apiKeys[p.name]}
                        onChange={(e) => setApiKey(p.name, e.target.value)}
                        placeholder={`Enter ${p.displayName} API key`}
                        className="w-full px-3 py-2 text-sm border border-[var(--color-border)] bg-white focus:border-[var(--color-accent)] focus:outline-none font-mono"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-[var(--color-text-muted)] mt-3">
                  Keys are stored in localStorage (visible in devtools).
                </p>
              </div>
            </div>
          )}

          {activeTab === 'generation' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1">
                  Temperature: {generationParams.temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={generationParams.temperature}
                  onChange={(e) =>
                    setGenerationParams({ temperature: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Higher = more creative, lower = more focused
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Max Tokens: {generationParams.maxTokens}
                </label>
                <input
                  type="range"
                  min="64"
                  max="4096"
                  step="64"
                  value={generationParams.maxTokens}
                  onChange={(e) =>
                    setGenerationParams({ maxTokens: parseInt(e.target.value) })
                  }
                  className="w-full"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Maximum length of generated response
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1">
                  Top P: {generationParams.topP}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={generationParams.topP}
                  onChange={(e) =>
                    setGenerationParams({ topP: parseFloat(e.target.value) })
                  }
                  className="w-full"
                />
                <p className="text-xs text-[var(--color-text-muted)] mt-1">
                  Nucleus sampling threshold
                </p>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div>
              <label className="block text-xs font-medium mb-1">
                System Prompt
              </label>
              <textarea
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                placeholder="Enter a system prompt to be included with all generations..."
                className="w-full px-3 py-2 text-sm border border-[var(--color-border)] bg-white focus:border-[var(--color-accent)] focus:outline-none font-mono h-48 resize-none"
              />
              <p className="text-xs text-[var(--color-text-muted)] mt-2">
                This prompt is prepended to every generation request.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-4 py-3 border-t border-[var(--color-border)]">
          <button
            onClick={closeSettings}
            className="text-xs px-4 py-2 bg-[var(--color-accent)] text-white hover:opacity-90 transition-opacity"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
