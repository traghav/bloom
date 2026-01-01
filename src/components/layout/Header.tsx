import { useRef } from 'react';
import { useSettingsStore, useTreeStore, useUiStore } from '../../stores';
import { exportToJson, downloadJson, parseImportedJson, importedNodesToMap } from '../../utils/export';

export function Header() {
  const { currentProvider, currentModel, openSettings, generationMode, setGenerationMode } =
    useSettingsStore();
  const { nodes, canUndo, canRedo, undo, redo } = useTreeStore();
  const { openSearch, isGenerating, setError } = useUiStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    const json = exportToJson(nodes, 'loom-tree');
    const filename = `loom-export-${new Date().toISOString().slice(0, 10)}.json`;
    downloadJson(json, filename);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const parsed = parseImportedJson(text);

      if (!parsed) {
        setError('Invalid file format. Please select a valid Loom export file.');
        return;
      }

      const nodeMap = importedNodesToMap(parsed.nodes);
      let rootId: string | null = null;
      for (const node of Object.values(nodeMap)) {
        if (node.parentId === null) {
          rootId = node.id;
          break;
        }
      }

      // Update the store with imported nodes
      useTreeStore.setState({
        nodes: nodeMap,
        rootId,
        selectedNodeId: rootId,
      });

      // Persist to database
      await useTreeStore.getState()._persistNodes();
    } catch {
      setError('Failed to import file. Please try again.');
    }

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <header className="h-12 border-b border-[var(--color-border)] bg-[var(--color-bg)] flex items-center justify-between px-4 flex-shrink-0">
      {/* Left: Title */}
      <div className="flex items-center gap-4">
        <h1 className="text-sm font-medium tracking-tight">LOOM</h1>
      </div>

      {/* Center: Model info */}
      <div className="flex items-center gap-3">
        <button
          onClick={openSettings}
          className="text-xs px-2 py-1 border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
        >
          {currentProvider}/{currentModel}
        </button>

        {/* Generation mode toggle */}
        <div className="flex border border-[var(--color-border)]">
          <button
            onClick={() => setGenerationMode('continue')}
            className={`text-xs px-2 py-1 transition-colors ${
              generationMode === 'continue'
                ? 'bg-[var(--color-accent)] text-white'
                : 'hover:bg-[var(--color-border)]'
            }`}
          >
            Continue
          </button>
          <button
            onClick={() => setGenerationMode('respond')}
            className={`text-xs px-2 py-1 transition-colors ${
              generationMode === 'respond'
                ? 'bg-[var(--color-accent)] text-white'
                : 'hover:bg-[var(--color-border)]'
            }`}
          >
            Respond
          </button>
        </div>

        {isGenerating && (
          <span className="text-xs text-[var(--color-text-muted)]">
            Generating...
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={!canUndo()}
          className="text-xs px-2 py-1 border border-[var(--color-border)] hover:border-[var(--color-accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Undo (Ctrl+Z)"
        >
          Undo
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className="text-xs px-2 py-1 border border-[var(--color-border)] hover:border-[var(--color-accent)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </button>

        {/* Search */}
        <button
          onClick={openSearch}
          className="text-xs px-2 py-1 border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
          title="Search (Ctrl+F)"
        >
          Search
        </button>

        {/* Export */}
        <button
          onClick={handleExport}
          className="text-xs px-2 py-1 border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
          title="Export tree as JSON"
        >
          Export
        </button>

        {/* Import */}
        <button
          onClick={handleImportClick}
          className="text-xs px-2 py-1 border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
          title="Import tree from JSON"
        >
          Import
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Settings */}
        <button
          onClick={openSettings}
          className="text-xs px-2 py-1 border border-[var(--color-border)] hover:border-[var(--color-accent)] transition-colors"
          title="Settings"
        >
          Settings
        </button>
      </div>
    </header>
  );
}
