import { CommitKitPanel } from '../extension/CommitKitPanel';
import { GitService } from '../extension/GitService';
import * as vscode from 'vscode';

jest.mock('../extension/GitService');

const mockSnapshot = {
  branchName: 'main',
  upstream: 'origin/main',
  ahead: 0,
  behind: 0,
  staged: [],
  unstaged: [],
  untracked: [],
  hasChanges: false,
  hasStaged: false,
  stats: { staged: 0, unstaged: 0, untracked: 0 },
  commitMessage: { subject: '', body: '' }
};

describe('CommitKitPanel', () => {
  const gitService = {
    getStatusSnapshot: jest.fn().mockResolvedValue(mockSnapshot),
    onDidChange: jest.fn(() => ({ dispose: jest.fn() })),
    stage: jest.fn().mockResolvedValue(undefined),
    unstage: jest.fn().mockResolvedValue(undefined),
    stageAll: jest.fn().mockResolvedValue(undefined),
    unstageAll: jest.fn().mockResolvedValue(undefined),
    discardChanges: jest.fn().mockResolvedValue(undefined),
    updateCommitMessage: jest.fn().mockResolvedValue(undefined),
    commit: jest.fn().mockResolvedValue(undefined),
    getDiff: jest.fn().mockResolvedValue('diff')
  } as unknown as GitService;

  let listeners: Array<(message: any) => unknown> = [];
  let panel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    listeners = [];

    panel = {
      webview: {
        html: '',
        postMessage: jest.fn(() => Promise.resolve(true)),
        asWebviewUri: jest.fn((value) => value),
        onDidReceiveMessage: (cb: (message: any) => void) => {
          listeners.push(cb);
          return { dispose: jest.fn() };
        }
      },
      onDidDispose: jest.fn(() => ({ dispose: jest.fn() })),
      reveal: jest.fn(),
      dispose: jest.fn()
    };

    (vscode.window.createWebviewPanel as jest.Mock).mockReturnValue(panel);
  });

  afterEach(() => {
    if (CommitKitPanel.currentPanel) {
      CommitKitPanel.currentPanel.dispose();
    }
  });

  const flushPromises = () => new Promise(process.nextTick);

  test('initializes and posts status on creation', async () => {
    CommitKitPanel.createOrShow(vscode.Uri.file('/extension'), gitService);
    await flushPromises();

    expect(panel.webview.postMessage).toHaveBeenCalledWith({
      command: 'statusUpdated',
      snapshot: mockSnapshot
    });
  });

  test('handles stage requests', async () => {
    CommitKitPanel.createOrShow(vscode.Uri.file('/extension'), gitService);
    await flushPromises();

    expect(listeners).toHaveLength(1);

    await listeners[0]!({ command: 'stage', uri: 'file:///tmp/file.ts' });

    expect(gitService.stage).toHaveBeenCalled();
    expect(panel.webview.postMessage).toHaveBeenLastCalledWith({
      command: 'statusUpdated',
      snapshot: mockSnapshot
    });
  });

  test('handles commit and posts completion', async () => {
    CommitKitPanel.createOrShow(vscode.Uri.file('/extension'), gitService);
    await flushPromises();

    await listeners[0]!({
      command: 'commit',
      payload: { message: { subject: 'feat', body: '' }, options: { amend: false, signoff: false, push: false } }
    });

    expect(gitService.commit).toHaveBeenCalledWith({ subject: 'feat', body: '' }, { amend: false, signoff: false, push: false });
    expect(panel.webview.postMessage).toHaveBeenCalledWith({ command: 'commitComplete' });
  });
});
