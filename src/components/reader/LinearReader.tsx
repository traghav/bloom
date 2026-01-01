import { useTreeStore, useUiStore } from '../../stores';
import { NodeSection } from './NodeSection';
import { NodeEditor } from './NodeEditor';
import { BatchButtons } from '../generation/BatchButtons';

export function LinearReader() {
  const {
    selectedNodeId,
    getPath,
    getNode,
    createChildNode,
    getChildren,
  } = useTreeStore();

  const { error, clearError } = useUiStore();

  if (!selectedNodeId) {
    return (
      <div className="h-full flex items-center justify-center text-[var(--color-text-muted)]">
        No node selected
      </div>
    );
  }

  const path = getPath(selectedNodeId);
  const selectedNode = getNode(selectedNodeId);
  const children = selectedNode ? getChildren(selectedNode.id) : [];

  const handleCreateChild = () => {
    createChildNode(selectedNodeId, '', 'human');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Error banner */}
      {error && (
        <div className="flex-shrink-0 bg-red-50 border-b border-red-200 px-4 py-2 flex items-center justify-between">
          <span className="text-sm text-red-700">{error}</span>
          <button
            onClick={clearError}
            className="text-xs text-red-700 hover:text-red-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-3xl mx-auto space-y-3">
          {path.map((node, index) => {
            const isLast = index === path.length - 1;

            return (
              <NodeSection
                key={node.id}
                node={node}
                isSelected={node.id === selectedNodeId}
                isLast={isLast}
              >
                {isLast ? (
                  <NodeEditor
                    nodeId={node.id}
                    initialText={node.text}
                    readOnly={false}
                  />
                ) : null}
              </NodeSection>
            );
          })}

          {/* Children preview */}
          {children.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[var(--color-border)]">
              <div className="text-xs text-[var(--color-text-muted)] mb-2">
                {children.length} child node{children.length > 1 ? 's' : ''}:
              </div>
              <div className="flex flex-wrap gap-2">
                {children.map((child) => (
                  <button
                    key={child.id}
                    onClick={() => useTreeStore.getState().selectNode(child.id)}
                    className={`
                      text-xs px-2 py-1 border border-[var(--color-border)]
                      hover:border-[var(--color-accent)] transition-colors
                      max-w-[200px] truncate
                      ${child.source === 'ai' ? 'bg-[var(--color-ai-bg)]' : 'bg-[var(--color-human-bg)]'}
                      ${child.isStreaming ? 'animate-pulse' : ''}
                    `}
                  >
                    {child.isStreaming ? 'Generating...' : (
                      <>
                        {child.text.slice(0, 50) || 'Empty'}
                        {child.text.length > 50 ? '...' : ''}
                      </>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Action bar */}
      <div className="flex-shrink-0 border-t border-[var(--color-border)] p-3 bg-[var(--color-bg)]">
        <div className="max-w-3xl mx-auto flex items-center gap-2">
          <button
            onClick={handleCreateChild}
            className="text-xs px-3 py-1.5 border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent)] hover:text-white transition-colors"
          >
            + New Child
          </button>

          <div className="ml-auto">
            <BatchButtons />
          </div>
        </div>
      </div>
    </div>
  );
}
