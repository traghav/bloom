import { useMemo } from 'react';
import { useTreeStore, useUiStore } from '../stores';
import type { TreeNode } from '../types';

interface SearchResult {
  node: TreeNode;
  matchStart: number;
  matchEnd: number;
  snippet: string;
}

// Simple fuzzy matching
function fuzzyMatch(text: string, query: string): { matches: boolean; score: number; start: number; end: number } {
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  // Exact match
  const exactIndex = lowerText.indexOf(lowerQuery);
  if (exactIndex !== -1) {
    return { matches: true, score: 100, start: exactIndex, end: exactIndex + query.length };
  }

  // Fuzzy match - check if all query characters appear in order
  let queryIdx = 0;
  let firstMatch = -1;
  let lastMatch = -1;

  for (let i = 0; i < lowerText.length && queryIdx < lowerQuery.length; i++) {
    if (lowerText[i] === lowerQuery[queryIdx]) {
      if (firstMatch === -1) firstMatch = i;
      lastMatch = i;
      queryIdx++;
    }
  }

  if (queryIdx === lowerQuery.length) {
    // Score based on how close together the matches are
    const spread = lastMatch - firstMatch;
    const score = Math.max(0, 50 - spread);
    return { matches: true, score, start: firstMatch, end: lastMatch + 1 };
  }

  return { matches: false, score: 0, start: -1, end: -1 };
}

// Extract snippet around match
function extractSnippet(text: string, start: number, end: number, maxLength: number = 100): string {
  const halfLen = Math.floor(maxLength / 2);
  const snippetStart = Math.max(0, start - halfLen);
  const snippetEnd = Math.min(text.length, end + halfLen);

  let snippet = text.slice(snippetStart, snippetEnd);

  if (snippetStart > 0) snippet = '...' + snippet;
  if (snippetEnd < text.length) snippet = snippet + '...';

  return snippet;
}

export function useSearch() {
  const { nodes } = useTreeStore();
  const { searchQuery } = useUiStore();

  const results = useMemo<SearchResult[]>(() => {
    if (!searchQuery || searchQuery.length < 2) return [];

    const matches: SearchResult[] = [];

    for (const node of Object.values(nodes)) {
      const match = fuzzyMatch(node.text, searchQuery);
      if (match.matches) {
        matches.push({
          node,
          matchStart: match.start,
          matchEnd: match.end,
          snippet: extractSnippet(node.text, match.start, match.end),
        });
      }
    }

    // Sort by score (highest first)
    return matches.sort((a, b) => {
      const scoreA = fuzzyMatch(a.node.text, searchQuery).score;
      const scoreB = fuzzyMatch(b.node.text, searchQuery).score;
      return scoreB - scoreA;
    });
  }, [nodes, searchQuery]);

  // Get set of node IDs that match (for tree filtering)
  const matchingNodeIds = useMemo(() => {
    return new Set(results.map((r) => r.node.id));
  }, [results]);

  return {
    results,
    matchingNodeIds,
    hasResults: results.length > 0,
    resultCount: results.length,
  };
}
