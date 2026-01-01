import { useEffect, useRef } from 'react';
import { useUiStore, useTreeStore } from '../../stores';
import { useSearch } from '../../hooks/useSearch';

export function SearchModal() {
  const { isSearchOpen, closeSearch, searchQuery, setSearchQuery } = useUiStore();
  const { selectNode } = useTreeStore();
  const { results, resultCount } = useSearch();
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when opened
  useEffect(() => {
    if (isSearchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSearchOpen]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        if (!isSearchOpen) {
          useUiStore.getState().openSearch();
        }
      }
      if (e.key === 'Escape' && isSearchOpen) {
        closeSearch();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSearchOpen, closeSearch]);

  if (!isSearchOpen) return null;

  const handleResultClick = (nodeId: string) => {
    selectNode(nodeId);
    closeSearch();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center pt-20 z-50">
      <div className="bg-[var(--color-bg)] border border-[var(--color-border)] w-full max-w-xl flex flex-col max-h-[60vh]">
        {/* Search input */}
        <div className="flex items-center border-b border-[var(--color-border)]">
          <input
            ref={inputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search nodes..."
            className="flex-1 px-4 py-3 text-sm bg-transparent focus:outline-none"
          />
          <span className="px-4 text-xs text-[var(--color-text-muted)]">
            {searchQuery.length >= 2 ? `${resultCount} result${resultCount !== 1 ? 's' : ''}` : ''}
          </span>
          <button
            onClick={closeSearch}
            className="px-4 text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            ✕
          </button>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {searchQuery.length < 2 ? (
            <div className="p-4 text-sm text-[var(--color-text-muted)]">
              Type at least 2 characters to search...
            </div>
          ) : results.length === 0 ? (
            <div className="p-4 text-sm text-[var(--color-text-muted)]">
              No results found for "{searchQuery}"
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {results.map((result) => (
                <button
                  key={result.node.id}
                  onClick={() => handleResultClick(result.node.id)}
                  className={`
                    w-full text-left px-4 py-3 hover:bg-[var(--color-border)] transition-colors
                    ${result.node.source === 'ai' ? 'bg-[var(--color-ai-bg)]' : ''}
                  `}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] px-1 py-0.5 ${
                        result.node.source === 'ai' ? 'bg-blue-200' : 'bg-gray-200'
                      }`}
                    >
                      {result.node.source.toUpperCase()}
                    </span>
                    {result.node.role && (
                      <span className="text-[10px] px-1 py-0.5 bg-gray-200">
                        {result.node.role}
                      </span>
                    )}
                  </div>
                  <div className="text-sm font-mono text-[var(--color-text)]">
                    {result.snippet}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        <div className="border-t border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-text-muted)]">
          Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">Enter</kbd> to select,{' '}
          <kbd className="px-1 py-0.5 bg-gray-100 rounded">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
