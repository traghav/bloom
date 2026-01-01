import type { TreeNode, TreeNodeMap } from '../types';

const now = Date.now();

// Create sample nodes
const root: TreeNode = {
  id: 'sample-root',
  parentId: null,
  text: `# Welcome to Loom

This is a **multiversal tree writing interface** for exploring branching narratives with AI.

## How it works

1. **Write** in any node using Markdown
2. **Generate** AI continuations using the buttons below
3. **Branch** by creating new child nodes
4. **Navigate** the tree on the right panel

## Key concepts

- **Nodes** contain text (human-written or AI-generated)
- **Branches** let you explore different narrative paths
- **Fork-on-Edit**: Editing a node with children creates a fork
- **Tree History**: All changes are recorded, you can undo/redo

Start by editing this node or generating some AI content!`,
  role: 'user',
  source: 'human',
  createdAt: now,
  updatedAt: now,
  metadata: {},
};

const child1: TreeNode = {
  id: 'sample-child-1',
  parentId: 'sample-root',
  text: `## Example: Creative Writing

Imagine a world where trees could walk. Not metaphorically, but literally—their roots would untangle from the soil like fingers from a glove, and they'd lumber across the landscape in search of better sunlight, richer soil, or simply for the joy of movement.

*Try generating a continuation of this story!*`,
  role: 'user',
  source: 'human',
  createdAt: now + 1000,
  updatedAt: now + 1000,
  metadata: {},
};

const child2: TreeNode = {
  id: 'sample-child-2',
  parentId: 'sample-root',
  text: `## Example: Prompt Engineering

System: You are a helpful assistant that explains complex topics simply.

User: Explain quantum entanglement to a 10-year-old.

*Use this as a starting point to test different prompts and compare AI responses!*`,
  role: 'user',
  source: 'human',
  createdAt: now + 2000,
  updatedAt: now + 2000,
  metadata: {},
};

const aiResponse: TreeNode = {
  id: 'sample-ai-response',
  parentId: 'sample-child-1',
  text: `The first tree to discover this ability was an ancient oak named Mossheart. She had grown tired of watching the same meadow for six hundred years and decided, quite simply, to leave.

Her neighbors—a grove of ash trees who had never considered such a thing—watched in stunned silence as Mossheart gathered her roots into something like feet and took her first tentative step. The ground trembled. Birds fled. A family of squirrels had to relocate in a hurry.

"Where are you going?" called out the eldest ash.

Mossheart paused, bark creaking as she turned what passed for her face toward the horizon. "I've heard there's a lake three valleys over. I'd like to see it before another century passes."

And with that, she walked on.`,
  role: 'assistant',
  source: 'ai',
  createdAt: now + 3000,
  updatedAt: now + 3000,
  metadata: {
    model: 'sample-model',
    provider: 'sample',
    generationMode: 'continue',
  },
};

export const sampleNodes: TreeNodeMap = {
  [root.id]: root,
  [child1.id]: child1,
  [child2.id]: child2,
  [aiResponse.id]: aiResponse,
};

export const sampleRootId = root.id;
