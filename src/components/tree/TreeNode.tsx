import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { TreeNode } from '../../types';

interface TreeNodeData {
  node: TreeNode;
  isSelected: boolean;
}

export const TreeNodeComponent = memo(function TreeNodeComponent({
  data,
}: { data: TreeNodeData }) {
  // Handle the case where data might be the actual TreeNodeData or wrapped
  const nodeData = 'node' in data ? data : (data as unknown as TreeNodeData);
  const { node, isSelected } = nodeData;

  // Truncate text for display
  const displayText = node.text.length > 80
    ? node.text.slice(0, 80) + '...'
    : node.text || 'Empty';

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-[var(--color-border)] !w-2 !h-2"
      />

      <div
        className={`
          w-[180px] p-3 border-2 transition-colors cursor-pointer
          ${node.source === 'ai' ? 'bg-[var(--color-ai-bg)]' : 'bg-[var(--color-human-bg)]'}
          ${isSelected
            ? 'border-[var(--color-accent)]'
            : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
          }
        `}
      >
        {/* Header */}
        <div className="flex items-center gap-1 mb-1">
          <span
            className={`text-[10px] px-1 py-0.5 ${
              node.source === 'ai' ? 'bg-blue-200' : 'bg-gray-200'
            }`}
          >
            {node.source.toUpperCase()}
          </span>
          {node.role && (
            <span className="text-[10px] px-1 py-0.5 bg-gray-200">
              {node.role}
            </span>
          )}
          {node.isStreaming && (
            <span className="text-[10px] px-1 py-0.5 bg-yellow-200 animate-pulse">
              ...
            </span>
          )}
        </div>

        {/* Content preview */}
        <div className="text-xs text-[var(--color-text)] line-clamp-2 font-mono">
          {displayText}
        </div>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-[var(--color-border)] !w-2 !h-2"
      />
    </>
  );
});
