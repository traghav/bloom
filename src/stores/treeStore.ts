import { create } from 'zustand';
import type { TreeNode, TreeNodeMap, NodeSource } from '../types/node';
import { createNode } from '../types/node';
import type { TreeHistoryEntry, TreeAction } from '../types/tree';
import {
  computeAncestors,
  computeChildren,
  computeDescendants,
  computeSiblings,
} from '../types/tree';
import { db, saveNodes, saveHistoryEntry } from '../db';
import { sampleNodes, sampleRootId } from '../sample/sampleTree';

interface TreeStore {
  // State
  nodes: TreeNodeMap;
  rootId: string | null;
  selectedNodeId: string | null;
  currentDocumentId: string | null;

  // History state
  historyEntries: TreeHistoryEntry[];
  currentEntryId: string | null;

  // Streaming state
  streamingNodeIds: Set<string>;

  // Computed helpers
  getNode: (id: string) => TreeNode | undefined;
  getChildren: (parentId: string) => TreeNode[];
  getAncestors: (nodeId: string) => TreeNode[];
  getDescendants: (nodeId: string) => TreeNode[];
  getSiblings: (nodeId: string) => TreeNode[];
  hasChildren: (nodeId: string) => boolean;
  getPath: (nodeId: string) => TreeNode[];

  // Actions
  initialize: (documentId: string) => Promise<void>;
  selectNode: (nodeId: string | null) => void;

  // Node mutations (with history)
  createChildNode: (
    parentId: string | null,
    text: string,
    source: NodeSource,
    options?: Partial<Pick<TreeNode, 'role' | 'metadata'>>
  ) => string;
  updateNodeText: (nodeId: string, text: string) => void;
  deleteNode: (nodeId: string) => void;

  // Fork-on-edit
  forkNode: (nodeId: string, newText: string) => string;

  // Clone operations
  cloneNode: (nodeId: string) => string | null;
  cloneBranch: (nodeId: string) => string | null;

  // Quick add
  addEmptyChild: (parentId: string) => string;

  // Clear tree
  clearTree: () => Promise<void>;

  // Batch generation
  createSiblingNodes: (
    parentId: string | null,
    nodes: Array<{
      text: string;
      source: NodeSource;
      metadata?: TreeNode['metadata'];
    }>
  ) => string[];

  // Streaming
  setNodeStreaming: (nodeId: string, isStreaming: boolean) => void;
  appendToNode: (nodeId: string, text: string) => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Internal
  _recordHistory: (action: TreeAction) => void;
  _persistNodes: () => Promise<void>;
}

export const useTreeStore = create<TreeStore>((set, get) => ({
  // Initial state
  nodes: {},
  rootId: null,
  selectedNodeId: null,
  currentDocumentId: null,
  historyEntries: [],
  currentEntryId: null,
  streamingNodeIds: new Set(),

  // Computed helpers
  getNode: (id) => get().nodes[id],

  getChildren: (parentId) => computeChildren(get().nodes, parentId),

  getAncestors: (nodeId) => computeAncestors(get().nodes, nodeId),

  getDescendants: (nodeId) => computeDescendants(get().nodes, nodeId),

  getSiblings: (nodeId) => computeSiblings(get().nodes, nodeId),

  hasChildren: (nodeId) => computeChildren(get().nodes, nodeId).length > 0,

  getPath: (nodeId) => computeAncestors(get().nodes, nodeId),

  // Initialize from database
  initialize: async (documentId) => {
    const nodes = await db.nodes.toArray();
    const nodeMap: TreeNodeMap = {};
    let rootId: string | null = null;

    for (const node of nodes) {
      nodeMap[node.id] = node;
      if (node.parentId === null) {
        rootId = node.id;
      }
    }

    // If no nodes exist, load sample tree for onboarding
    if (Object.keys(nodeMap).length === 0) {
      // Use sample tree
      const initialNodes = { ...sampleNodes };
      rootId = sampleRootId;
      await saveNodes(initialNodes);

      // Create initial history entry
      const entry: TreeHistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        action: { type: 'INITIAL', nodeId: sampleRootId },
        snapshot: { ...initialNodes },
        parentEntryId: null,
      };
      await saveHistoryEntry(documentId, entry);

      set({
        nodes: initialNodes,
        rootId,
        selectedNodeId: rootId,
        currentDocumentId: documentId,
        historyEntries: [entry],
        currentEntryId: entry.id,
      });
    } else {
      set({
        nodes: nodeMap,
        rootId,
        selectedNodeId: rootId,
        currentDocumentId: documentId,
      });
    }
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  // Create a child node
  createChildNode: (parentId, text, source, options) => {
    const node = createNode(parentId, text, source, options);
    const { nodes } = get();

    const newNodes = { ...nodes, [node.id]: node };

    // Update root if this is the first node
    const newRootId = parentId === null ? node.id : get().rootId;

    set({ nodes: newNodes, rootId: newRootId, selectedNodeId: node.id });

    get()._recordHistory({ type: 'CREATE_NODE', nodeId: node.id });
    get()._persistNodes();

    return node.id;
  },

  // Update node text (triggers fork if has children)
  updateNodeText: (nodeId, text) => {
    const { nodes, hasChildren, forkNode } = get();
    const node = nodes[nodeId];
    if (!node) return;

    // Fork-on-edit: if this node has children, fork instead of editing
    if (hasChildren(nodeId)) {
      forkNode(nodeId, text);
      return;
    }

    const oldText = node.text;
    const updatedNode = { ...node, text, updatedAt: Date.now() };
    const newNodes = { ...nodes, [nodeId]: updatedNode };

    set({ nodes: newNodes });
    get()._recordHistory({ type: 'EDIT_NODE', nodeId, oldText });
    get()._persistNodes();
  },

  // Fork a node (create sibling with new text)
  forkNode: (nodeId, newText) => {
    const { nodes } = get();
    const original = nodes[nodeId];
    if (!original) return nodeId;

    const forkedNode = createNode(original.parentId, newText, 'human', {
      forkedFrom: nodeId,
    });

    const newNodes = { ...nodes, [forkedNode.id]: forkedNode };

    set({ nodes: newNodes, selectedNodeId: forkedNode.id });
    get()._recordHistory({
      type: 'FORK_NODE',
      originalId: nodeId,
      newId: forkedNode.id,
    });
    get()._persistNodes();

    return forkedNode.id;
  },

  // Clone a node as a sibling (same parent, copy of content)
  cloneNode: (nodeId) => {
    const { nodes } = get();
    const original = nodes[nodeId];
    if (!original) return null;

    const clonedNode = createNode(original.parentId, original.text, original.source, {
      role: original.role,
      metadata: { ...original.metadata },
    });

    const newNodes = { ...nodes, [clonedNode.id]: clonedNode };

    set({ nodes: newNodes, selectedNodeId: clonedNode.id });
    get()._recordHistory({
      type: 'CREATE_NODE',
      nodeId: clonedNode.id,
    });
    get()._persistNodes();

    return clonedNode.id;
  },

  // Clone a node and all its descendants as a sibling branch
  cloneBranch: (nodeId) => {
    const { nodes, getDescendants } = get();
    const original = nodes[nodeId];
    if (!original) return null;

    const descendants = getDescendants(nodeId);
    const newNodes = { ...nodes };
    const idMapping: Record<string, string> = {};

    // Clone the root node of the branch
    const clonedRoot = createNode(original.parentId, original.text, original.source, {
      role: original.role,
      metadata: { ...original.metadata },
    });
    idMapping[original.id] = clonedRoot.id;
    newNodes[clonedRoot.id] = clonedRoot;

    // Clone all descendants, updating parent references
    for (const desc of descendants) {
      const newParentId = desc.parentId ? idMapping[desc.parentId] : null;
      const clonedDesc = createNode(newParentId, desc.text, desc.source, {
        role: desc.role,
        metadata: { ...desc.metadata },
      });
      idMapping[desc.id] = clonedDesc.id;
      newNodes[clonedDesc.id] = clonedDesc;
    }

    set({ nodes: newNodes, selectedNodeId: clonedRoot.id });
    get()._recordHistory({
      type: 'CREATE_NODE',
      nodeId: clonedRoot.id,
    });
    get()._persistNodes();

    return clonedRoot.id;
  },

  // Quick add an empty child node
  addEmptyChild: (parentId) => {
    const node = createNode(parentId, '', 'human');
    const { nodes } = get();

    const newNodes = { ...nodes, [node.id]: node };

    set({ nodes: newNodes, selectedNodeId: node.id });

    get()._recordHistory({ type: 'CREATE_NODE', nodeId: node.id });
    get()._persistNodes();

    return node.id;
  },

  // Delete a node and its descendants
  deleteNode: (nodeId) => {
    const { nodes, rootId, selectedNodeId, getDescendants, getNode } = get();
    const node = getNode(nodeId);
    if (!node) return;

    // Can't delete root
    if (nodeId === rootId) return;

    // Collect all nodes to delete
    const descendants = getDescendants(nodeId);
    const nodesToDelete = [node, ...descendants];
    const nodeIdsToDelete = new Set(nodesToDelete.map((n) => n.id));

    // Create new nodes map without deleted nodes
    const newNodes: TreeNodeMap = {};
    for (const [id, n] of Object.entries(nodes)) {
      if (!nodeIdsToDelete.has(id)) {
        newNodes[id] = n;
      }
    }

    // Update selection if needed
    let newSelectedId = selectedNodeId;
    if (selectedNodeId && nodeIdsToDelete.has(selectedNodeId)) {
      newSelectedId = node.parentId;
    }

    set({ nodes: newNodes, selectedNodeId: newSelectedId });
    get()._recordHistory({
      type: 'DELETE_NODE',
      nodeId,
      deletedNodes: nodesToDelete,
    });
    get()._persistNodes();
  },

  // Clear the entire tree and start fresh
  clearTree: async () => {
    const { currentDocumentId } = get();

    // Create a new empty root node
    const rootNode = createNode(null, '', 'human');
    const newNodes = { [rootNode.id]: rootNode };

    // Clear IndexedDB
    await db.nodes.clear();
    await saveNodes(newNodes);

    // Create initial history entry
    if (currentDocumentId) {
      const entry: TreeHistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        action: { type: 'INITIAL', nodeId: rootNode.id },
        snapshot: { ...newNodes },
        parentEntryId: null,
      };
      await saveHistoryEntry(currentDocumentId, entry);

      set({
        nodes: newNodes,
        rootId: rootNode.id,
        selectedNodeId: rootNode.id,
        historyEntries: [entry],
        currentEntryId: entry.id,
      });
    } else {
      set({
        nodes: newNodes,
        rootId: rootNode.id,
        selectedNodeId: rootNode.id,
        historyEntries: [],
        currentEntryId: null,
      });
    }
  },

  // Create multiple sibling nodes (for batch generation)
  createSiblingNodes: (parentId, nodeData) => {
    const { nodes } = get();
    const newNodes = { ...nodes };
    const createdIds: string[] = [];

    for (const data of nodeData) {
      const node = createNode(parentId, data.text, data.source, {
        metadata: data.metadata,
      });
      newNodes[node.id] = node;
      createdIds.push(node.id);
    }

    set({ nodes: newNodes, selectedNodeId: createdIds[0] });
    get()._recordHistory({ type: 'GENERATE', nodeIds: createdIds });
    get()._persistNodes();

    return createdIds;
  },

  // Streaming support
  setNodeStreaming: (nodeId, isStreaming) => {
    const { streamingNodeIds, nodes } = get();
    const newStreamingIds = new Set(streamingNodeIds);

    if (isStreaming) {
      newStreamingIds.add(nodeId);
    } else {
      newStreamingIds.delete(nodeId);
    }

    // Update node's isStreaming flag
    const node = nodes[nodeId];
    if (node) {
      const newNodes = {
        ...nodes,
        [nodeId]: { ...node, isStreaming },
      };
      set({ nodes: newNodes, streamingNodeIds: newStreamingIds });
    } else {
      set({ streamingNodeIds: newStreamingIds });
    }
  },

  appendToNode: (nodeId, text) => {
    const { nodes } = get();
    const node = nodes[nodeId];
    if (!node) return;

    const updatedNode = {
      ...node,
      text: node.text + text,
      updatedAt: Date.now(),
    };

    set({ nodes: { ...nodes, [nodeId]: updatedNode } });
    // Don't record history for streaming appends - final state is recorded when done
  },

  // History management
  _recordHistory: (action) => {
    const { nodes, historyEntries, currentEntryId, currentDocumentId } = get();
    if (!currentDocumentId) return;

    const entry: TreeHistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      action,
      snapshot: { ...nodes },
      parentEntryId: currentEntryId,
    };

    const newEntries = [...historyEntries, entry];
    set({ historyEntries: newEntries, currentEntryId: entry.id });

    // Persist history entry
    saveHistoryEntry(currentDocumentId, entry);
  },

  _persistNodes: async () => {
    const { nodes } = get();
    await saveNodes(nodes);
  },

  undo: () => {
    const { historyEntries, currentEntryId } = get();
    if (!currentEntryId) return;

    const currentEntry = historyEntries.find((e) => e.id === currentEntryId);
    if (!currentEntry || !currentEntry.parentEntryId) return;

    const parentEntry = historyEntries.find(
      (e) => e.id === currentEntry.parentEntryId
    );
    if (!parentEntry) return;

    // Restore snapshot from parent entry
    const nodes = { ...parentEntry.snapshot };
    let rootId: string | null = null;
    for (const node of Object.values(nodes)) {
      if (node.parentId === null) {
        rootId = node.id;
        break;
      }
    }

    set({
      nodes,
      rootId,
      currentEntryId: parentEntry.id,
    });

    get()._persistNodes();
  },

  redo: () => {
    const { historyEntries, currentEntryId } = get();

    // Find a child entry of current
    const childEntry = historyEntries.find(
      (e) => e.parentEntryId === currentEntryId
    );
    if (!childEntry) return;

    // Restore snapshot from child entry
    const nodes = { ...childEntry.snapshot };
    let rootId: string | null = null;
    for (const node of Object.values(nodes)) {
      if (node.parentId === null) {
        rootId = node.id;
        break;
      }
    }

    set({
      nodes,
      rootId,
      currentEntryId: childEntry.id,
    });

    get()._persistNodes();
  },

  canUndo: () => {
    const { historyEntries, currentEntryId } = get();
    if (!currentEntryId) return false;
    const current = historyEntries.find((e) => e.id === currentEntryId);
    return !!current?.parentEntryId;
  },

  canRedo: () => {
    const { historyEntries, currentEntryId } = get();
    return historyEntries.some((e) => e.parentEntryId === currentEntryId);
  },
}));
