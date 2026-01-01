import { useCallback, useRef } from 'react';
import { useTreeStore, useSettingsStore, useUiStore } from '../stores';
import { getProvider } from '../providers';
import type { Message } from '../types';
import { createNode } from '../types';
import { computeAncestors } from '../types/tree';

interface GenerationOptions {
  count?: number;
}

export function useGeneration() {
  const abortControllerRef = useRef<AbortController | null>(null);

  const {
    nodes,
    selectedNodeId,
    createSiblingNodes,
    setNodeStreaming,
    appendToNode,
  } = useTreeStore();

  const {
    currentProvider,
    currentModel,
    generationParams,
    generationMode,
    systemPrompt,
    getApiKey,
  } = useSettingsStore();

  const { setIsGenerating, setError } = useUiStore();

  // Build context messages from ancestry
  const buildContextMessages = useCallback(
    (nodeId: string): Message[] => {
      const messages: Message[] = [];

      // Get ancestry path
      const ancestors = computeAncestors(nodes, nodeId);

      for (const node of ancestors) {
        messages.push({
          role: node.role || 'user',
          content: node.text,
        });
      }

      return messages;
    },
    [nodes]
  );

  // Generate completions
  const generate = useCallback(
    async (options: GenerationOptions = {}) => {
      const { count = 1 } = options;

      if (!selectedNodeId) {
        setError('No node selected');
        return;
      }

      const apiKey = getApiKey(currentProvider);
      if (!apiKey) {
        setError(`No API key configured for ${currentProvider}. Open settings to add one.`);
        return;
      }

      const provider = getProvider(currentProvider);
      if (!provider) {
        setError(`Provider ${currentProvider} not found`);
        return;
      }

      // Cancel any existing generation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      setIsGenerating(true);
      setError(null);

      try {
        const contextMessages = buildContextMessages(selectedNodeId);

        // Generate multiple completions
        const results: Array<{
          text: string;
          metadata: NonNullable<ReturnType<typeof createNode>['metadata']>;
        }> = [];

        for (let i = 0; i < count; i++) {
          if (abortController.signal.aborted) break;

          // Create a placeholder node for streaming
          const parentId = selectedNodeId;
          const newNodes = useTreeStore.getState().createSiblingNodes(parentId, [
            {
              text: '',
              source: 'ai',
              metadata: {
                model: currentModel,
                provider: currentProvider,
                generationParams: { ...generationParams },
                generationMode,
              },
            },
          ]);

          const newNodeId = newNodes[0];
          setNodeStreaming(newNodeId, true);

          try {
            const result = await provider.generate(
              {
                messages: contextMessages,
                model: currentModel,
                temperature: generationParams.temperature,
                maxTokens: generationParams.maxTokens,
                topP: generationParams.topP,
                mode: generationMode,
              },
              apiKey,
              (chunk) => {
                if (!chunk.done && chunk.text) {
                  appendToNode(newNodeId, chunk.text);
                }
              },
              abortController.signal
            );

            // Update node with final metadata
            const finalNode = useTreeStore.getState().getNode(newNodeId);
            if (finalNode) {
              const updatedMetadata = {
                ...finalNode.metadata,
                latencyMs: result.latencyMs,
                tokenUsage: result.tokenUsage,
                logprobs: result.logprobs,
                rawResponse: result.rawResponse,
              };

              // Update the node in the store with full metadata
              const currentNodes = useTreeStore.getState().nodes;
              useTreeStore.setState({
                nodes: {
                  ...currentNodes,
                  [newNodeId]: {
                    ...finalNode,
                    metadata: updatedMetadata,
                    isStreaming: false,
                  },
                },
              });
            }

            results.push({
              text: result.text,
              metadata: {
                model: currentModel,
                provider: currentProvider,
                generationParams: { ...generationParams },
                generationMode,
                latencyMs: result.latencyMs,
                tokenUsage: result.tokenUsage,
                logprobs: result.logprobs,
                rawResponse: result.rawResponse,
              },
            });
          } catch (error) {
            setNodeStreaming(newNodeId, false);
            if (error instanceof Error && error.name !== 'AbortError') {
              throw error;
            }
          }
        }

        // Select first generated node
        if (results.length > 0) {
          // Already selected by createSiblingNodes
        }
      } catch (error) {
        if (error instanceof Error) {
          if (error.name !== 'AbortError') {
            setError(error.message);
          }
        } else {
          setError('An unexpected error occurred');
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    },
    [
      selectedNodeId,
      currentProvider,
      currentModel,
      generationParams,
      generationMode,
      systemPrompt,
      getApiKey,
      buildContextMessages,
      createSiblingNodes,
      setNodeStreaming,
      appendToNode,
      setIsGenerating,
      setError,
    ]
  );

  // Cancel current generation
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  }, [setIsGenerating]);

  return {
    generate,
    cancel,
  };
}
