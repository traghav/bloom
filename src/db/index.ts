import Dexie, { type Table } from 'dexie';
import type { TreeNode, TreeNodeMap } from '../types/node';
import type { TreeHistoryEntry } from '../types/tree';

// Database schema
export interface TreeDocument {
  id: string;
  name: string;
  rootId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface StoredHistoryEntry {
  id: string;
  documentId: string;
  timestamp: number;
  action: string; // JSON serialized TreeAction
  snapshot: string; // JSON serialized TreeNodeMap
  parentEntryId: string | null;
}

class LoomDatabase extends Dexie {
  nodes!: Table<TreeNode, string>;
  documents!: Table<TreeDocument, string>;
  historyEntries!: Table<StoredHistoryEntry, string>;

  constructor() {
    super('loom');

    this.version(1).stores({
      nodes: 'id, parentId, createdAt, updatedAt',
      documents: 'id, createdAt, updatedAt',
      historyEntries: 'id, documentId, timestamp, parentEntryId',
    });
  }
}

export const db = new LoomDatabase();

// Document operations
export async function createDocument(name: string): Promise<TreeDocument> {
  const doc: TreeDocument = {
    id: crypto.randomUUID(),
    name,
    rootId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await db.documents.add(doc);
  return doc;
}

export async function getDocument(id: string): Promise<TreeDocument | undefined> {
  return db.documents.get(id);
}

export async function updateDocument(
  id: string,
  updates: Partial<TreeDocument>
): Promise<void> {
  await db.documents.update(id, { ...updates, updatedAt: Date.now() });
}

export async function deleteDocument(id: string): Promise<void> {
  await db.transaction('rw', [db.documents, db.nodes, db.historyEntries], async () => {
    await db.historyEntries.where('documentId').equals(id).delete();
    // Nodes aren't linked to documents directly in schema,
    // but we clear them via history entries
    await db.documents.delete(id);
  });
}

export async function listDocuments(): Promise<TreeDocument[]> {
  return db.documents.orderBy('updatedAt').reverse().toArray();
}

// Node operations
export async function saveNodes(nodes: TreeNodeMap): Promise<void> {
  const nodeArray = Object.values(nodes);
  await db.nodes.bulkPut(nodeArray);
}

export async function loadNodes(): Promise<TreeNodeMap> {
  const nodes = await db.nodes.toArray();
  const map: TreeNodeMap = {};
  for (const node of nodes) {
    map[node.id] = node;
  }
  return map;
}

export async function clearNodes(): Promise<void> {
  await db.nodes.clear();
}

// History operations
export async function saveHistoryEntry(
  documentId: string,
  entry: TreeHistoryEntry
): Promise<void> {
  const stored: StoredHistoryEntry = {
    id: entry.id,
    documentId,
    timestamp: entry.timestamp,
    action: JSON.stringify(entry.action),
    snapshot: JSON.stringify(entry.snapshot),
    parentEntryId: entry.parentEntryId,
  };
  await db.historyEntries.put(stored);
}

export async function loadHistoryEntries(
  documentId: string
): Promise<TreeHistoryEntry[]> {
  const stored = await db.historyEntries
    .where('documentId')
    .equals(documentId)
    .sortBy('timestamp');

  return stored.map((s) => ({
    id: s.id,
    timestamp: s.timestamp,
    action: JSON.parse(s.action),
    snapshot: JSON.parse(s.snapshot),
    parentEntryId: s.parentEntryId,
  }));
}

export async function clearHistoryEntries(documentId: string): Promise<void> {
  await db.historyEntries.where('documentId').equals(documentId).delete();
}

// Export/Import
export interface ExportedTree {
  version: 1;
  document: TreeDocument;
  nodes: TreeNode[];
  history: TreeHistoryEntry[];
  exportedAt: number;
}

export async function exportTree(documentId: string): Promise<ExportedTree | null> {
  const document = await getDocument(documentId);
  if (!document) return null;

  const nodes = await db.nodes.toArray();
  const history = await loadHistoryEntries(documentId);

  return {
    version: 1,
    document,
    nodes,
    history,
    exportedAt: Date.now(),
  };
}

export async function importTree(data: ExportedTree): Promise<string> {
  const newDocId = crypto.randomUUID();
  const newDoc: TreeDocument = {
    ...data.document,
    id: newDocId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await db.transaction('rw', [db.documents, db.nodes, db.historyEntries], async () => {
    await db.documents.add(newDoc);
    await db.nodes.bulkPut(data.nodes);

    for (const entry of data.history) {
      await saveHistoryEntry(newDocId, entry);
    }
  });

  return newDocId;
}
