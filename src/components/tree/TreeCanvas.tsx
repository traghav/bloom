import { useCallback, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  type Node,
  type Edge,
  type NodeTypes,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { useTreeStore } from '../../stores';
import { TreeNodeComponent } from './TreeNode';

const nodeTypes: NodeTypes = {
  treeNode: TreeNodeComponent,
};

export function TreeCanvas() {
  const { nodes: treeNodes, rootId, selectedNodeId, selectNode, getChildren } =
    useTreeStore();

  // Convert tree data to React Flow format
  const { flowNodes, flowEdges } = useMemo(() => {
    const flowNodes: Node[] = [];
    const flowEdges: Edge[] = [];

    if (!rootId || Object.keys(treeNodes).length === 0) {
      return { flowNodes, flowEdges };
    }

    // BFS to position nodes
    const nodesByDepth: Map<number, string[]> = new Map();
    const nodePositions: Map<string, { x: number; y: number }> = new Map();

    // First pass: collect nodes by depth
    const visited = new Set<string>();
    const bfsQueue = [rootId];

    while (bfsQueue.length > 0) {
      const nodeId = bfsQueue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = treeNodes[nodeId];
      if (!node) continue;

      // Calculate depth
      let depth = 0;
      let current = node;
      while (current.parentId) {
        depth++;
        current = treeNodes[current.parentId];
        if (!current) break;
      }

      if (!nodesByDepth.has(depth)) {
        nodesByDepth.set(depth, []);
      }
      nodesByDepth.get(depth)!.push(nodeId);

      // Add children to queue
      const children = getChildren(nodeId);
      for (const child of children) {
        bfsQueue.push(child.id);
      }
    }

    // Second pass: calculate positions
    const nodeWidth = 180;
    const nodeHeight = 80;
    const horizontalSpacing = 40;
    const verticalSpacing = 100;

    for (const [depth, nodeIds] of nodesByDepth) {
      const totalWidth = nodeIds.length * nodeWidth + (nodeIds.length - 1) * horizontalSpacing;
      const startX = -totalWidth / 2;

      nodeIds.forEach((nodeId, index) => {
        const x = startX + index * (nodeWidth + horizontalSpacing);
        const y = depth * (nodeHeight + verticalSpacing);
        nodePositions.set(nodeId, { x, y });
      });
    }

    // Create React Flow nodes and edges
    for (const [nodeId, position] of nodePositions) {
      const node = treeNodes[nodeId];
      if (!node) continue;

      flowNodes.push({
        id: nodeId,
        type: 'treeNode',
        position,
        data: {
          node,
          isSelected: nodeId === selectedNodeId,
        },
      });

      if (node.parentId) {
        flowEdges.push({
          id: `${node.parentId}-${nodeId}`,
          source: node.parentId,
          target: nodeId,
          type: 'smoothstep',
          style: { stroke: 'var(--color-border)', strokeWidth: 2 },
        });
      }
    }

    return { flowNodes, flowEdges };
  }, [treeNodes, rootId, selectedNodeId, getChildren]);

  const [nodes, setNodes, onNodesChange] = useNodesState(flowNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(flowEdges);

  // Update nodes when tree changes
  useMemo(() => {
    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [flowNodes, flowEdges, setNodes, setEdges]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  return (
    <div className="h-full w-full bg-[var(--color-bg)]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.1}
        maxZoom={2}
        defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
      >
        <Background color="var(--color-border)" gap={20} />
        <Controls className="!bg-[var(--color-bg)] !border-[var(--color-border)]" />
      </ReactFlow>
    </div>
  );
}
