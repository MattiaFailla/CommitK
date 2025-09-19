import * as path from 'path';
import * as vscode from 'vscode';
import { execFile } from 'child_process';

type GitAPI = {
  repositories: Repository[];
  onDidOpenRepository(callback: (repository: Repository) => void): vscode.Disposable;
  onDidCloseRepository(callback: (repository: Repository) => void): vscode.Disposable;
};

type Repository = {
  rootUri: vscode.Uri;
  state: RepositoryState;
  inputBox: { value: string };
  commit(message: string, options?: { amend?: boolean; signoff?: boolean }): Promise<void>;
  add(uris: vscode.Uri[]): Promise<void>;
  revert(uris: vscode.Uri[], options?: { staged: boolean }): Promise<void>;
  clean(paths: vscode.Uri[]): Promise<void>;
  push(): Promise<void>;
};

type RepositoryState = {
  HEAD?: {
    name?: string;
    upstream?: string;
    ahead?: number;
    behind?: number;
  };
  indexChanges: Change[];
  workingTreeChanges: Change[];
  untrackedChanges: Change[];
  onDidChange(listener: () => void): vscode.Disposable;
};

type Change = {
  readonly uri?: vscode.Uri;
  readonly resourceUri?: vscode.Uri;
  readonly originalUri?: vscode.Uri;
  readonly renameUri?: vscode.Uri;
  readonly renameResourceUri?: vscode.Uri;
  readonly status: number;
};

export type CommitOptionFlags = {
  amend?: boolean;
  signoff?: boolean;
  push?: boolean;
};

export type SerializableChange = {
  uri: string;
  previousUri?: string;
  relativePath: string;
  fileName: string;
  status: ChangeStatus;
  statusText: string;
  staged: boolean;
  isConflict: boolean;
  isUntracked: boolean;
};

export type StatusSnapshot = {
  branchName?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
  staged: SerializableChange[];
  unstaged: SerializableChange[];
  untracked: SerializableChange[];
  hasChanges: boolean;
  hasStaged: boolean;
  stats: {
    staged: number;
    unstaged: number;
    untracked: number;
  };
  commitMessage: CommitMessage;
};

export type CommitMessage = {
  subject: string;
  body: string;
};

export enum ChangeStatus {
  INDEX_MODIFIED = 'INDEX_MODIFIED',
  INDEX_ADDED = 'INDEX_ADDED',
  INDEX_DELETED = 'INDEX_DELETED',
  INDEX_RENAMED = 'INDEX_RENAMED',
  INDEX_COPIED = 'INDEX_COPIED',
  MODIFIED = 'MODIFIED',
  DELETED = 'DELETED',
  UNTRACKED = 'UNTRACKED',
  IGNORED = 'IGNORED',
  INTENT_TO_ADD = 'INTENT_TO_ADD',
  ADDED_BY_US = 'ADDED_BY_US',
  ADDED_BY_THEM = 'ADDED_BY_THEM',
  DELETED_BY_US = 'DELETED_BY_US',
  DELETED_BY_THEM = 'DELETED_BY_THEM',
  BOTH_ADDED = 'BOTH_ADDED',
  BOTH_DELETED = 'BOTH_DELETED',
  BOTH_MODIFIED = 'BOTH_MODIFIED'
}

type DiffContext = {
  uri: vscode.Uri;
  previousUri?: vscode.Uri;
  staged: boolean;
  status: ChangeStatus;
};

type GitCommandResult = {
  stdout: string;
  stderr: string;
  exitCode: number;
};

type StatusCodeDescriptor = {
  status: ChangeStatus;
  text: string;
  isIndex: boolean;
  isConflict: boolean;
};

const statusCodeMap: Record<number, StatusCodeDescriptor> = {
  0: { status: ChangeStatus.INDEX_MODIFIED, text: 'Staged • Modified', isIndex: true, isConflict: false },
  1: { status: ChangeStatus.INDEX_ADDED, text: 'Staged • Added', isIndex: true, isConflict: false },
  2: { status: ChangeStatus.INDEX_DELETED, text: 'Staged • Deleted', isIndex: true, isConflict: false },
  3: { status: ChangeStatus.INDEX_RENAMED, text: 'Staged • Renamed', isIndex: true, isConflict: false },
  4: { status: ChangeStatus.INDEX_COPIED, text: 'Staged • Copied', isIndex: true, isConflict: false },
  5: { status: ChangeStatus.MODIFIED, text: 'Modified', isIndex: false, isConflict: false },
  6: { status: ChangeStatus.DELETED, text: 'Deleted', isIndex: false, isConflict: false },
  7: { status: ChangeStatus.UNTRACKED, text: 'Untracked', isIndex: false, isConflict: false },
  8: { status: ChangeStatus.IGNORED, text: 'Ignored', isIndex: false, isConflict: false },
  9: { status: ChangeStatus.INTENT_TO_ADD, text: 'Intent to add', isIndex: false, isConflict: false },
  10: { status: ChangeStatus.ADDED_BY_US, text: 'Conflict • Added by us', isIndex: false, isConflict: true },
  11: { status: ChangeStatus.ADDED_BY_THEM, text: 'Conflict • Added by them', isIndex: false, isConflict: true },
  12: { status: ChangeStatus.DELETED_BY_US, text: 'Conflict • Deleted by us', isIndex: false, isConflict: true },
  13: { status: ChangeStatus.DELETED_BY_THEM, text: 'Conflict • Deleted by them', isIndex: false, isConflict: true },
  14: { status: ChangeStatus.BOTH_ADDED, text: 'Conflict • Both added', isIndex: false, isConflict: true },
  15: { status: ChangeStatus.BOTH_DELETED, text: 'Conflict • Both deleted', isIndex: false, isConflict: true },
  16: { status: ChangeStatus.BOTH_MODIFIED, text: 'Conflict • Both modified', isIndex: false, isConflict: true }
};

export class GitService implements vscode.Disposable {
  private readonly onDidChangeEmitter = new vscode.EventEmitter<void>();
  private readonly disposables: vscode.Disposable[] = [this.onDidChangeEmitter];
  private readonly repositoryListeners = new Map<Repository, vscode.Disposable>();

  public readonly onDidChange = this.onDidChangeEmitter.event;

  public constructor() {
    const git = this.gitAPI;
    if (!git) {
      return;
    }

    git.repositories.forEach((repository) => this.registerRepository(repository));

    this.disposables.push(
      git.onDidOpenRepository((repository) => {
        this.registerRepository(repository);
        this.onDidChangeEmitter.fire();
      }),
      git.onDidCloseRepository((repository) => {
        this.unregisterRepository(repository);
        this.onDidChangeEmitter.fire();
      })
    );
  }

  public dispose(): void {
    for (const disposable of this.disposables.splice(0)) {
      try {
        disposable.dispose();
      } catch (error) {
        console.error('Failed to dispose GitService listener', error);
      }
    }
    this.repositoryListeners.clear();
  }

  public async getStatusSnapshot(): Promise<StatusSnapshot> {
    const repository = this.getPrimaryRepository();
    const root = repository.rootUri.fsPath;
    const head = repository.state.HEAD ?? {};

    const staged = repository.state.indexChanges.map((change) =>
      this.toSerializableChange(change, root, true)
    );
    const unstaged = repository.state.workingTreeChanges.map((change) =>
      this.toSerializableChange(change, root, false)
    );
    const untracked = repository.state.untrackedChanges.map((change) =>
      this.toSerializableChange(change, root, false, true)
    );

    const stats = {
      staged: staged.length,
      unstaged: unstaged.length,
      untracked: untracked.length
    };

    const commitMessage = this.splitCommitMessage(repository.inputBox.value ?? '');

    const snapshot: StatusSnapshot = {
      ahead: head.ahead ?? 0,
      behind: head.behind ?? 0,
      staged,
      unstaged,
      untracked,
      hasChanges: stats.staged + stats.unstaged + stats.untracked > 0,
      hasStaged: stats.staged > 0,
      stats,
      commitMessage
    };

    if (head.name) {
      snapshot.branchName = head.name;
    }

    if (head.upstream) {
      snapshot.upstream = head.upstream;
    }

    return snapshot;
  }

  public async stage(uri: vscode.Uri): Promise<void> {
    const repository = this.getPrimaryRepository();
    await repository.add([uri]);
  }

  public async unstage(uri: vscode.Uri): Promise<void> {
    const repository = this.getPrimaryRepository();
    await repository.revert([uri], { staged: true });
  }

  public async stageAll(): Promise<void> {
    const repository = this.getPrimaryRepository();
    const { indexChanges, workingTreeChanges, untrackedChanges } = repository.state;
    const uris = new Set<string>();

    [...indexChanges, ...workingTreeChanges, ...untrackedChanges].forEach((change) => {
      const uri = this.getChangeUri(change);
      if (uri) {
        uris.add(uri.toString());
      }
    });

    const uriObjects = Array.from(uris).map((value) => vscode.Uri.parse(value));
    if (uriObjects.length > 0) {
      await repository.add(uriObjects);
    }
  }

  public async unstageAll(): Promise<void> {
    const repository = this.getPrimaryRepository();
    const { indexChanges } = repository.state;
    const uris = indexChanges
      .map((change) => this.getChangeUri(change))
      .filter((uri): uri is vscode.Uri => Boolean(uri));

    if (uris.length === 0) {
      return;
    }

    await repository.revert(uris, { staged: true });
  }

  public async discardChanges(uri: vscode.Uri): Promise<void> {
    const repository = this.getPrimaryRepository();
    await repository.clean([uri]);
  }

  public async updateCommitMessage(message: CommitMessage): Promise<void> {
    const repository = this.getPrimaryRepository();
    repository.inputBox.value = this.joinCommitMessage(message);
  }

  public async commit(message: CommitMessage, options: CommitOptionFlags = {}): Promise<void> {
    const repository = this.getPrimaryRepository();

    const payload = this.joinCommitMessage(message);
    repository.inputBox.value = payload;

    const commitOptions: { amend?: boolean; signoff?: boolean } = {};
    if (typeof options.amend === 'boolean') {
      commitOptions.amend = options.amend;
    }
    if (typeof options.signoff === 'boolean') {
      commitOptions.signoff = options.signoff;
    }

    await repository.commit(payload, commitOptions);

    if (options.push) {
      await repository.push();
    }
  }

  public async getDiff(context: DiffContext): Promise<string> {
    const repository = this.getPrimaryRepository();
    const repoRoot = repository.rootUri.fsPath;
    const relativePath = this.toRelativePath(context.uri, repoRoot);

    if (context.status === ChangeStatus.UNTRACKED) {
      return this.getDiffForUntracked(repoRoot, relativePath);
    }

    if (context.staged) {
      return this.getDiffForStaged(repoRoot, relativePath);
    }

    return this.getDiffForWorkingTree(repoRoot, relativePath);
  }

  private async getDiffForStaged(repoRoot: string, relativePath: string): Promise<string> {
    const { stdout } = await this.execGit(repoRoot, ['diff', '--cached', '--color=never', '--', relativePath], true);
    return stdout.trimEnd();
  }

  private async getDiffForWorkingTree(repoRoot: string, relativePath: string): Promise<string> {
    const { stdout } = await this.execGit(repoRoot, ['diff', '--color=never', '--', relativePath], true);
    return stdout.trimEnd();
  }

  private async getDiffForUntracked(repoRoot: string, relativePath: string): Promise<string> {
    const nullDevice = process.platform === 'win32' ? 'NUL' : '/dev/null';
    const { stdout } = await this.execGit(
      repoRoot,
      ['diff', '--no-index', '--color=never', '--', nullDevice, relativePath],
      true
    );
    return stdout.trimEnd();
  }

  private async execGit(cwd: string, args: string[], allowNonZeroExit = false): Promise<GitCommandResult> {
    return new Promise<GitCommandResult>((resolve, reject) => {
      execFile('git', args, { cwd, maxBuffer: 20 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          const err = error as NodeJS.ErrnoException;
          const code = typeof err.code === 'number' ? err.code : Number(err.code);
          const exitCode = Number.isFinite(code) ? Number(code) : 1;
          if (allowNonZeroExit && exitCode === 1) {
            resolve({ stdout, stderr, exitCode });
            return;
          }

          reject(new Error(stderr?.trim() || error.message));
          return;
        }

        resolve({ stdout, stderr, exitCode: 0 });
      }).on('error', (spawnError) => {
        reject(spawnError);
      });
    });
  }

  private joinCommitMessage(message: CommitMessage): string {
    const subject = message.subject.trim();
    const body = message.body.replace(/\s+$/g, '');
    if (!body) {
      return subject;
    }

    return `${subject}\n\n${body}`;
  }

  private splitCommitMessage(value: string): CommitMessage {
    if (!value) {
      return { subject: '', body: '' };
    }

    const lines = value.replace(/\r\n?/g, '\n').split('\n');
    const subject = lines.shift() ?? '';
    const body = lines.join('\n').trim();

    return { subject, body };
  }

  private toSerializableChange(change: Change, repoRoot: string, staged: boolean, forceUntracked = false): SerializableChange {
    const descriptor = statusCodeMap[change.status as number] ?? {
      status: staged ? ChangeStatus.INDEX_MODIFIED : ChangeStatus.MODIFIED,
      text: staged ? 'Staged • Modified' : 'Modified',
      isIndex: staged,
      isConflict: false
    };

    const uri = this.getChangeUri(change);
    if (!uri) {
      throw new Error('Cannot resolve URI for change');
    }

    const relativePath = this.toRelativePath(uri, repoRoot);
    const fileName = path.basename(relativePath);

    const renameUri = change.renameResourceUri ?? change.renameUri ?? change.originalUri;
    const previousUri = renameUri ? renameUri.toString(true) : undefined;

    const isUntracked = forceUntracked || descriptor.status === ChangeStatus.UNTRACKED;

    const result: SerializableChange = {
      uri: uri.toString(true),
      relativePath,
      fileName,
      status: descriptor.status,
      statusText: descriptor.text,
      staged,
      isConflict: descriptor.isConflict,
      isUntracked
    };

    if (previousUri) {
      result.previousUri = previousUri;
    }

    return result;
  }

  private toRelativePath(uri: vscode.Uri, repoRoot: string): string {
    const relative = path.relative(repoRoot, uri.fsPath);
    return relative === '' ? path.basename(uri.fsPath) : relative.replace(/\\/g, '/');
  }

  private getChangeUri(change: Change): vscode.Uri | undefined {
    return change.resourceUri ?? change.uri ?? change.originalUri ?? undefined;
  }

  private registerRepository(repository: Repository): void {
    if (this.repositoryListeners.has(repository)) {
      return;
    }

    const disposable = repository.state.onDidChange(() => this.onDidChangeEmitter.fire());
    this.repositoryListeners.set(repository, disposable);
    this.disposables.push(disposable);
  }

  private unregisterRepository(repository: Repository): void {
    const disposable = this.repositoryListeners.get(repository);
    if (disposable) {
      disposable.dispose();
      this.repositoryListeners.delete(repository);
    }
  }

  private get gitAPI(): GitAPI | undefined {
    const extension = vscode.extensions.getExtension('vscode.git');
    const exports = extension?.exports;
    if (!exports) {
      return undefined;
    }

    try {
      if (typeof exports.getAPI === 'function') {
        return exports.getAPI(1) as GitAPI;
      }
    } catch (error) {
      console.warn('Failed to get Git API', error);
    }

    return undefined;
  }

  private getPrimaryRepository(): Repository {
    const git = this.gitAPI;
    if (!git || git.repositories.length === 0) {
      throw new Error('No Git repository detected in the current workspace.');
    }

    const [repository] = git.repositories;
    if (!repository) {
      throw new Error('No Git repository detected in the current workspace.');
    }
    return repository;
  }
}
