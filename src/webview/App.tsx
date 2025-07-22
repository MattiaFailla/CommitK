import React, { useState, useEffect } from 'react';
import { CommitModal } from './components/CommitModal';
import { GitStatus } from '../extension/GitService';

declare global {
  interface Window {
    acquireVsCodeApi: () => {
      postMessage: (message: any) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
  }
}

const vscode = window.acquireVsCodeApi();

export interface GitStatusData {
  staged: string[];
  unstaged: string[];
  untracked: string[];
  hasChanges: boolean;
}

function App(): React.JSX.Element {
  const [gitStatus, setGitStatus] = useState<GitStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Request initial git status
    vscode.postMessage({ command: 'getGitStatus' });

    // Listen for messages from the extension
    const handleMessage = (event: MessageEvent) => {
      const message = event.data;
      
      switch (message.command) {
        case 'gitStatus':
          setGitStatus(message.data);
          setLoading(false);
          break;
        case 'commitSuccess':
          // Refresh git status after successful commit
          vscode.postMessage({ command: 'getGitStatus' });
          break;
        case 'commitError':
          setError(message.error);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleCommit = (message: string, amend: boolean = false) => {
    vscode.postMessage({
      command: 'commit',
      data: { message, amend }
    });
  };

  if (loading) {
    return (
      <div className="app">
        <div className="loading">Loading Git status...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app">
        <div className="error">Error: {error}</div>
      </div>
    );
  }

  if (!gitStatus?.hasChanges) {
    return (
      <div className="app">
        <div className="no-changes">No changes to commit</div>
      </div>
    );
  }

  return (
    <div className="app">
      <CommitModal
        gitStatus={gitStatus}
        onCommit={handleCommit}
      />
    </div>
  );
}

export default App; 