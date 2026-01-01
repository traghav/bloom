import type { TreeNode, TreeNodeMap } from '../types';
import type { TreeHistoryEntry } from '../types/tree';

export interface ExportedTree {
  version: 1;
  name: string;
  nodes: TreeNode[];
  exportedAt: number;
}

export function exportToJson(nodes: TreeNodeMap, name: string = 'loom-tree'): string {
  const exported: ExportedTree = {
    version: 1,
    name,
    nodes: Object.values(nodes),
    exportedAt: Date.now(),
  };

  return JSON.stringify(exported, null, 2);
}

export function downloadJson(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportedJson(content: string): ExportedTree | null {
  try {
    const parsed = JSON.parse(content);

    // Validate structure
    if (typeof parsed !== 'object' || !parsed) return null;
    if (parsed.version !== 1) return null;
    if (!Array.isArray(parsed.nodes)) return null;

    // Validate nodes
    for (const node of parsed.nodes) {
      if (typeof node.id !== 'string') return null;
      if (typeof node.text !== 'string') return null;
      if (node.source !== 'human' && node.source !== 'ai') return null;
    }

    return parsed as ExportedTree;
  } catch {
    return null;
  }
}

export function importedNodesToMap(nodes: TreeNode[]): TreeNodeMap {
  const map: TreeNodeMap = {};
  for (const node of nodes) {
    map[node.id] = node;
  }
  return map;
}
