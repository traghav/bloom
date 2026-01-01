import { memo } from 'react';
import type { TreeNode } from '../../types';
import { useUiStore, useTreeStore } from '../../stores';

interface NodeSectionProps {
  node: TreeNode;
  isSelected: boolean;
  isLast: boolean;
  children?: React.ReactNode;
}

export const NodeSection = memo(function NodeSection({
  node,
  isSelected,
  isLast,
  children,
}: NodeSectionProps) {
  const { isNodeCollapsed, toggleNodeCollapse } = useUiStore();
  const { selectNode, hasChildren } = useTreeStore();

  const collapsed = isNodeCollapsed(node.id) && !isLast;
  const nodeHasChildren = hasChildren(node.id);

  return (
    <div
      className={`
        border transition-colors
        ${node.source === 'ai' ? 'bg-[var(--color-ai-bg)]' : 'bg-[var(--color-human-bg)]'}
        ${isSelected
          ? 'border-[var(--color-accent)] border-2'
          : 'border-[var(--color-border)]'
        }
      `}
    >
      {/* Header bar */}
      <div
        className={`
          flex items-center gap-2 px-3 py-2 border-b border-[var(--color-border)]
          bg-opacity-50 cursor-pointer select-none
          ${node.source === 'ai' ? 'bg-blue-50' : 'bg-gray-50'}
        `}
        onClick={() => selectNode(node.id)}
      >
        {/* Collapse toggle (only for ancestors) */}
        {!isLast && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleNodeCollapse(node.id);
            }}
            className="w-5 h-5 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
          >
            {collapsed ? '▶' : '▼'}
          </button>
        )}

        {/* Source badge */}
        <span
          className={`text-[10px] px-1.5 py-0.5 font-medium ${
            node.source === 'ai' ? 'bg-blue-200' : 'bg-gray-200'
          }`}
        >
          {node.source.toUpperCase()}
        </span>

        {/* Role badge */}
        {node.role && (
          <span className="text-[10px] px-1.5 py-0.5 bg-gray-200 font-medium">
            {node.role}
          </span>
        )}

        {/* Model info */}
        {node.metadata.model && (
          <span className="text-[10px] text-[var(--color-text-muted)]">
            {node.metadata.model}
          </span>
        )}

        {/* Has children indicator */}
        {nodeHasChildren && (
          <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
            {nodeHasChildren ? '⤵' : ''}
          </span>
        )}

        {/* Streaming indicator */}
        {node.isStreaming && (
          <span className="text-[10px] px-1.5 py-0.5 bg-yellow-200 animate-pulse ml-auto">
            streaming...
          </span>
        )}
      </div>

      {/* Content */}
      {!collapsed && (
        <div className="p-4">
          {children || (
            <div className="whitespace-pre-wrap font-mono text-sm min-h-[2em]">
              {node.text || (
                <span className="text-[var(--color-text-muted)] italic">
                  Empty node
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
