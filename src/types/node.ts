export type NodeRole = 'user' | 'assistant' | 'system';
export type NodeSource = 'human' | 'ai';
export type GenerationMode = 'continue' | 'respond';

export interface GenerationParams {
  temperature: number;
  maxTokens: number;
  topP: number;
}

export interface TokenUsage {
  prompt: number;
  completion: number;
}

export interface NodeMetadata {
  // Generation info
  model?: string;
  provider?: string;
  generationParams?: GenerationParams;
  generationMode?: GenerationMode;

  // Research data
  latencyMs?: number;
  tokenUsage?: TokenUsage;
  logprobs?: unknown;
  rawResponse?: unknown;
}

export interface TreeNode {
  id: string;
  parentId: string | null;
  text: string;
  role?: NodeRole;
  source: NodeSource;
  createdAt: number;
  updatedAt: number;
  metadata: NodeMetadata;

  // Fork-on-edit tracking
  forkedFrom?: string;

  // Streaming state (not persisted)
  isStreaming?: boolean;
}

export interface TreeNodeMap {
  [id: string]: TreeNode;
}

// Utility function to create a new node
export function createNode(
  parentId: string | null,
  text: string,
  source: NodeSource,
  options?: Partial<Pick<TreeNode, 'role' | 'metadata' | 'forkedFrom'>>
): TreeNode {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    parentId,
    text,
    source,
    createdAt: now,
    updatedAt: now,
    metadata: options?.metadata ?? {},
    role: options?.role,
    forkedFrom: options?.forkedFrom,
  };
}
