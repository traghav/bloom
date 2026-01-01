import type { TreeNode, TreeNodeMap } from './node';

// Tree action types for history tracking
export type TreeAction =
  | { type: 'CREATE_NODE'; nodeId: string }
  | { type: 'EDIT_NODE'; nodeId: string; oldText: string }
  | { type: 'DELETE_NODE'; nodeId: string; deletedNodes: TreeNode[] }
  | { type: 'FORK_NODE'; originalId: string; newId: string }
  | { type: 'GENERATE'; nodeIds: string[] }
  | { type: 'IMPORT'; count: number }
  | { type: 'INITIAL'; nodeId: string };

export interface TreeHistoryEntry {
  id: string;
  timestamp: number;
  action: TreeAction;
  snapshot: TreeNodeMap;
  parentEntryId: string | null;
}

export interface TreeState {
  nodes: TreeNodeMap;
  rootId: string | null;
  selectedNodeId: string | null;
}

export interface TreeHistoryState {
  entries: TreeHistoryEntry[];
  currentEntryId: string | null;
}

// Computed tree utilities
export interface TreeUtils {
  getNode: (id: string) => TreeNode | undefined;
  getChildren: (parentId: string) => TreeNode[];
  getAncestors: (nodeId: string) => TreeNode[];
  getDescendants: (nodeId: string) => TreeNode[];
  hasChildren: (nodeId: string) => boolean;
  getPath: (nodeId: string) => TreeNode[];
  getSiblings: (nodeId: string) => TreeNode[];
}

// Helper to compute children from flat map
export function computeChildren(nodes: TreeNodeMap, parentId: string): TreeNode[] {
  return Object.values(nodes)
    .filter((node) => node.parentId === parentId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

// Helper to compute ancestors (root first, current last)
export function computeAncestors(nodes: TreeNodeMap, nodeId: string): TreeNode[] {
  const ancestors: TreeNode[] = [];
  let current = nodes[nodeId];

  while (current) {
    ancestors.unshift(current);
    if (current.parentId) {
      current = nodes[current.parentId];
    } else {
      break;
    }
  }

  return ancestors;
}

// Helper to compute all descendants
export function computeDescendants(nodes: TreeNodeMap, nodeId: string): TreeNode[] {
  const descendants: TreeNode[] = [];
  const stack = computeChildren(nodes, nodeId);

  while (stack.length > 0) {
    const node = stack.pop()!;
    descendants.push(node);
    stack.push(...computeChildren(nodes, node.id));
  }

  return descendants;
}

// Helper to get sibling nodes
export function computeSiblings(nodes: TreeNodeMap, nodeId: string): TreeNode[] {
  const node = nodes[nodeId];
  if (!node || !node.parentId) return [];
  return computeChildren(nodes, node.parentId).filter((n) => n.id !== nodeId);
}

// Helper to get the full path from root to node
export function computePath(nodes: TreeNodeMap, nodeId: string): TreeNode[] {
  return computeAncestors(nodes, nodeId);
}
