import { useGeneration } from '../../hooks/useGeneration';
import { useSettingsStore, useUiStore } from '../../stores';

const BATCH_SIZES = [1, 3, 5, 10];

export function BatchButtons() {
  const { generate, cancel } = useGeneration();
  const { getApiKey, currentProvider, openSettings } = useSettingsStore();
  const { isGenerating } = useUiStore();

  const hasApiKey = !!getApiKey(currentProvider);

  const handleGenerate = (count: number) => {
    if (!hasApiKey) {
      openSettings();
      return;
    }
    generate({ count });
  };

  if (isGenerating) {
    return (
      <button
        onClick={cancel}
        className="text-xs px-3 py-1.5 border border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error)] hover:text-white transition-colors"
      >
        Cancel
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-[var(--color-text-muted)]">Generate:</span>
      {BATCH_SIZES.map((n) => (
        <button
          key={n}
          onClick={() => handleGenerate(n)}
          className={`
            text-xs px-2 py-1 border transition-colors
            ${hasApiKey
              ? 'border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white'
              : 'border-[var(--color-border)] opacity-50'
            }
          `}
          title={hasApiKey ? `Generate ${n} completion${n > 1 ? 's' : ''}` : 'Configure API key in settings'}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
