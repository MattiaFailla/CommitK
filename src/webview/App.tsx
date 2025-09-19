import React, { useEffect, useReducer, useState } from 'react';
import { ChangeListSidebar } from './components/ChangeListSidebar';
import { CommitForm } from './components/CommitForm';
import { DiffViewer } from './components/DiffViewer';
import { HeaderBar } from './components/HeaderBar';
import { ChangeItem, CommitMessage, StatusSnapshot } from './types';

declare global {
  interface Window {
    acquireVsCodeApi: <T = unknown>() => {
      postMessage: (message: T) => void;
      getState: () => any;
      setState: (state: any) => void;
    };
  }
}

const vscode = window.acquireVsCodeApi<any>();

const initialCommitMessage: CommitMessage = { subject: '', body: '' };

type State = {
  status?: StatusSnapshot;
  loading: boolean;
  error?: string;
  selectedChange?: ChangeItem;
  diff?: string;
  diffLoading: boolean;
  busy: boolean;
  banner?: string;
};

type Action =
  | { type: 'STATUS_RECEIVED'; snapshot: StatusSnapshot }
  | { type: 'STATUS_ERROR'; message: string }
  | { type: 'SELECT_CHANGE'; change?: ChangeItem }
  | { type: 'DIFF_RECEIVED'; uri: string; diff: string }
  | { type: 'COMMIT_STARTED' }
  | { type: 'COMMIT_COMPLETE' }
  | { type: 'BANNER'; message: string }
  | { type: 'CLEAR_BANNER' };

const initialState: State = {
  loading: true,
  diffLoading: false,
  busy: false
};

function findChange(snapshot: StatusSnapshot, uri: string | undefined): ChangeItem | undefined {
  if (!uri) {
    return undefined;
  }
  return snapshot.staged.concat(snapshot.unstaged, snapshot.untracked).find((item) => item.uri === uri);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'STATUS_RECEIVED': {
      const { snapshot } = action;
      const preserved = state.selectedChange ? findChange(snapshot, state.selectedChange.uri) : undefined;
      const fallback =
        preserved ??
        snapshot.staged[0] ??
        snapshot.unstaged[0] ??
        snapshot.untracked[0] ??
        undefined;

      return {
        ...state,
        status: snapshot,
        loading: false,
        error: undefined,
        banner: undefined,
        selectedChange: fallback,
        diff: undefined,
        diffLoading: Boolean(fallback)
      };
    }
    case 'STATUS_ERROR':
      return {
        ...state,
        loading: false,
        error: action.message,
        diffLoading: false
      };
    case 'SELECT_CHANGE':
      return {
        ...state,
        selectedChange: action.change,
        diff: undefined,
        diffLoading: Boolean(action.change)
      };
    case 'DIFF_RECEIVED':
      if (!state.selectedChange || state.selectedChange.uri !== action.uri) {
        return state;
      }
      return { ...state, diff: action.diff, diffLoading: false };
    case 'COMMIT_STARTED':
      return { ...state, busy: true };
    case 'COMMIT_COMPLETE':
      return { ...state, busy: false };
    case 'BANNER':
      return { ...state, banner: action.message };
    case 'CLEAR_BANNER':
      return { ...state, banner: undefined };
    default:
      return state;
  }
}

function postMessage(message: any): void {
  vscode.postMessage(message);
}

function App(): React.JSX.Element {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [commitMessage, setCommitMessage] = useState<CommitMessage>(initialCommitMessage);
  const [commitMessageDirty, setCommitMessageDirty] = useState(false);
  const [commitOptions, setCommitOptions] = useState({ amend: false, signoff: false });

  useEffect(() => {
    function handleMessage(event: MessageEvent) {
      const message = event.data;
      switch (message.command) {
        case 'statusUpdated': {
          dispatch({ type: 'STATUS_RECEIVED', snapshot: message.snapshot });
          if (!commitMessageDirty) {
            setCommitMessage(message.snapshot.commitMessage);
          }
          break;
        }
        case 'statusError': {
          dispatch({ type: 'STATUS_ERROR', message: message.message });
          break;
        }
        case 'diffLoaded': {
          dispatch({ type: 'DIFF_RECEIVED', uri: message.payload.uri, diff: message.payload.diff });
          break;
        }
        case 'commitComplete': {
          dispatch({ type: 'COMMIT_COMPLETE' });
          setCommitMessageDirty(false);
          break;
        }
        case 'error': {
          dispatch({ type: 'BANNER', message: message.message });
          dispatch({ type: 'COMMIT_COMPLETE' });
          break;
        }
        case 'info': {
          dispatch({ type: 'BANNER', message: message.message });
          break;
        }
        default:
          break;
      }
    }

    window.addEventListener('message', handleMessage);
    postMessage({ command: 'ready' });

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [commitMessageDirty]);

  useEffect(() => {
    if (!state.selectedChange) {
      return;
    }
    postMessage({
      command: 'selectChange',
      payload: {
        uri: state.selectedChange.uri,
        staged: state.selectedChange.staged,
        status: state.selectedChange.status,
        previousUri: state.selectedChange.previousUri
      }
    });
  }, [state.selectedChange, state.status?.stats.staged, state.status?.stats.unstaged, state.status?.stats.untracked]);

  const handleSelectChange = (change: ChangeItem) => {
    dispatch({ type: 'SELECT_CHANGE', change });
  };

  const handleStage = (change: ChangeItem) => {
    postMessage({ command: 'stage', uri: change.uri });
  };

  const handleUnstage = (change: ChangeItem) => {
    postMessage({ command: 'unstage', uri: change.uri });
  };

  const handleDiscard = (change: ChangeItem) => {
    if (confirm(`Discard local changes for ${change.relativePath}?`)) {
      postMessage({ command: 'discard', uri: change.uri });
    }
  };

  const handleStageAll = () => {
    postMessage({ command: 'stageAll' });
  };

  const handleUnstageAll = () => {
    postMessage({ command: 'unstageAll' });
  };

  const handleCommitMessageChange = (message: CommitMessage) => {
    setCommitMessage(message);
    setCommitMessageDirty(true);
    postMessage({ command: 'updateCommitMessage', payload: message });
  };

  const handleCommit = (options?: { push?: boolean }) => {
    if (!state.status) {
      return;
    }

    const payload: CommitMessage = {
      subject: commitMessage.subject.trim(),
      body: commitMessage.body
    };

    dispatch({ type: 'COMMIT_STARTED' });
    postMessage({
      command: 'commit',
      payload: {
        message: payload,
        options: {
          amend: commitOptions.amend,
          signoff: commitOptions.signoff,
          push: options?.push ?? false
        }
      }
    });
  };

  const handleRefresh = () => {
    postMessage({ command: 'refreshStatus' });
  };

  const handleOpenFile = (change: ChangeItem) => {
    postMessage({ command: 'openFile', uri: change.uri });
  };

  const { status } = state;

  return (
    <div className="commitkit-app">
      {status && (
        <HeaderBar
          branchName={status.branchName}
          upstream={status.upstream}
          ahead={status.ahead}
          behind={status.behind}
          stats={status.stats}
          onRefresh={handleRefresh}
          busy={state.busy}
        />
      )}

      {state.banner && (
        <div className="banner" role="alert">
          <span>{state.banner}</span>
          <button className="mini-button" onClick={() => dispatch({ type: 'CLEAR_BANNER' })}>
            Dismiss
          </button>
        </div>
      )}

      {state.loading ? (
        <div className="placeholder">Loading repository status…</div>
      ) : state.error ? (
        <div className="placeholder error">
          <p>{state.error}</p>
          <button className="primary" onClick={handleRefresh}>
            Retry
          </button>
        </div>
      ) : !status || !status.hasChanges ? (
        <div className="placeholder">
          <p>No pending changes.</p>
          <button className="secondary" onClick={handleRefresh}>
            Refresh
          </button>
        </div>
      ) : (
        <div className="app-content">
          <ChangeListSidebar
            staged={status.staged}
            unstaged={status.unstaged}
            untracked={status.untracked}
            selected={state.selectedChange}
            onSelect={handleSelectChange}
            onOpenFile={handleOpenFile}
            onStage={handleStage}
            onUnstage={handleUnstage}
            onDiscard={handleDiscard}
            onStageAll={handleStageAll}
            onUnstageAll={handleUnstageAll}
          />
          <div className="detail-column">
            <DiffViewer change={state.selectedChange} diff={state.diff} loading={state.diffLoading} />
            <CommitForm
              message={commitMessage}
              onMessageChange={handleCommitMessageChange}
              options={commitOptions}
              onOptionsChange={(options) => setCommitOptions(options)}
              onCommit={handleCommit}
              busy={state.busy}
              hasStaged={status.hasStaged}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
