import { useState } from 'react';
import { useTreeStore } from '../../stores';

interface NodeActionsProps {
  nodeId: string;
  compact?: boolean;
  className?: string;
}

export function NodeActions({ nodeId, compact = false, className = '' }: NodeActionsProps) {
  const {
    rootId,
    hasChildren,
    cloneNode,
    cloneBranch,
    addEmptyChild,
    deleteNode,
  } = useTreeStore();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const isRoot = nodeId === rootId;
  const nodeHasChildren = hasChildren(nodeId);

  const handleClone = (e: React.MouseEvent) => {
    e.stopPropagation();
    cloneNode(nodeId);
  };

  const handleCloneBranch = (e: React.MouseEvent) => {
    e.stopPropagation();
    cloneBranch(nodeId);
  };

  const handleAddChild = (e: React.MouseEvent) => {
    e.stopPropagation();
    addEmptyChild(nodeId);
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isRoot) return;

    if (nodeHasChildren) {
      setShowDeleteConfirm(true);
    } else {
      deleteNode(nodeId);
    }
  };

  const confirmDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteNode(nodeId);
    setShowDeleteConfirm(false);
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-0.5 ${className}`} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={handleAddChild}
          className="p-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
          title="Add child node"
        >
          +
        </button>
        <button
          onClick={handleClone}
          className="p-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
          title="Clone node"
        >
          ⧉
        </button>
        {nodeHasChildren && (
          <button
            onClick={handleCloneBranch}
            className="p-1 text-[10px] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-border)] transition-colors"
            title="Clone branch"
          >
            ⎇
          </button>
        )}
        {!isRoot && (
          <button
            onClick={handleDelete}
            className="p-1 text-[10px] text-[var(--color-text-muted)] hover:text-red-500 hover:bg-[var(--color-border)] transition-colors"
            title="Delete node"
          >
            ×
          </button>
        )}

        {showDeleteConfirm && (
          <div
            className="absolute top-full left-0 mt-1 bg-[var(--color-bg)] border border-[var(--color-border)] p-2 z-50 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-[10px] text-[var(--color-text-muted)] mb-1 whitespace-nowrap">
              Delete with children?
            </p>
            <div className="flex gap-1">
              <button
                onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                className="text-[10px] px-1.5 py-0.5 border border-[var(--color-border)] hover:bg-[var(--color-border)]"
              >
                No
              </button>
              <button
                onClick={confirmDelete}
                className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white hover:bg-red-600"
              >
                Yes
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-1 ${className}`} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={handleAddChild}
        className="text-[10px] px-1.5 py-0.5 border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-border)] transition-colors"
        title="Add child node"
      >
        + Child
      </button>
      <button
        onClick={handleClone}
        className="text-[10px] px-1.5 py-0.5 border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-border)] transition-colors"
        title="Clone node as sibling"
      >
        Clone
      </button>
      {nodeHasChildren && (
        <button
          onClick={handleCloneBranch}
          className="text-[10px] px-1.5 py-0.5 border border-[var(--color-border)] hover:border-[var(--color-accent)] hover:bg-[var(--color-border)] transition-colors"
          title="Clone node and all descendants"
        >
          Clone Branch
        </button>
      )}
      {!isRoot && (
        <>
          <button
            onClick={handleDelete}
            className="text-[10px] px-1.5 py-0.5 border border-[var(--color-border)] hover:border-red-500 hover:bg-red-50 hover:text-red-500 transition-colors"
            title="Delete node"
          >
            Delete
          </button>

          {showDeleteConfirm && (
            <div
              className="absolute top-full right-0 mt-1 bg-[var(--color-bg)] border border-[var(--color-border)] p-3 z-50 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <p className="text-xs text-[var(--color-text-muted)] mb-2">
                Delete this node and all its children?
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(false); }}
                  className="text-xs px-2 py-1 border border-[var(--color-border)] hover:bg-[var(--color-border)]"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="text-xs px-2 py-1 bg-red-500 text-white hover:bg-red-600"
                >
                  Delete All
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
