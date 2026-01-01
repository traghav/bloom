import { useEffect } from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import { SplitPane } from './components/layout/SplitPane';
import { Header } from './components/layout/Header';
import { LinearReader } from './components/reader/LinearReader';
import { TreeCanvas } from './components/tree/TreeCanvas';
import { SettingsModal } from './components/common/SettingsModal';
import { SearchModal } from './components/common/Search';
import { useTreeStore } from './stores';

// Import providers to register them
import './providers';

function App() {
  const { initialize } = useTreeStore();

  useEffect(() => {
    // Initialize with a default document
    initialize('default-doc');
  }, [initialize]);

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-hidden">
          <SplitPane
            left={<LinearReader />}
            right={<TreeCanvas />}
          />
        </main>
        <SettingsModal />
        <SearchModal />
      </div>
    </ReactFlowProvider>
  );
}

export default App;
