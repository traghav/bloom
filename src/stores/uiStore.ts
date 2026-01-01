import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UiStore {
  // Panel sizes (percentage for left panel)
  leftPanelWidth: number;
  setLeftPanelWidth: (width: number) => void;

  // Collapsed sections in linear reader (nodeId -> collapsed)
  collapsedNodes: Set<string>;
  toggleNodeCollapse: (nodeId: string) => void;
  isNodeCollapsed: (nodeId: string) => boolean;
  expandAllNodes: () => void;
  collapseAllNodes: (nodeIds: string[]) => void;

  // Search
  isSearchOpen: boolean;
  searchQuery: string;
  openSearch: () => void;
  closeSearch: () => void;
  setSearchQuery: (query: string) => void;

  // Loading states
  isGenerating: boolean;
  setIsGenerating: (isGenerating: boolean) => void;

  // Error state
  error: string | null;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useUiStore = create<UiStore>()(
  persist(
    (set, get) => ({
      // Panel sizes
      leftPanelWidth: 70,
      setLeftPanelWidth: (width) => set({ leftPanelWidth: width }),

      // Collapsed nodes
      collapsedNodes: new Set(),

      toggleNodeCollapse: (nodeId) => {
        const { collapsedNodes } = get();
        const newCollapsed = new Set(collapsedNodes);
        if (newCollapsed.has(nodeId)) {
          newCollapsed.delete(nodeId);
        } else {
          newCollapsed.add(nodeId);
        }
        set({ collapsedNodes: newCollapsed });
      },

      isNodeCollapsed: (nodeId) => get().collapsedNodes.has(nodeId),

      expandAllNodes: () => set({ collapsedNodes: new Set() }),

      collapseAllNodes: (nodeIds) => set({ collapsedNodes: new Set(nodeIds) }),

      // Search
      isSearchOpen: false,
      searchQuery: '',

      openSearch: () => set({ isSearchOpen: true, searchQuery: '' }),
      closeSearch: () => set({ isSearchOpen: false, searchQuery: '' }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      // Loading
      isGenerating: false,
      setIsGenerating: (isGenerating) => set({ isGenerating }),

      // Error
      error: null,
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),
    }),
    {
      name: 'loom-ui',
      partialize: (state) => ({
        leftPanelWidth: state.leftPanelWidth,
      }),
      // Custom serialization for Set
      storage: {
        getItem: (name) => {
          const str = localStorage.getItem(name);
          if (!str) return null;
          return JSON.parse(str);
        },
        setItem: (name, value) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => localStorage.removeItem(name),
      },
    }
  )
);
