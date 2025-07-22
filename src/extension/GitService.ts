import * as vscode from 'vscode';

export interface GitStatus {
  staged: string[];
  unstaged: string[];
  untracked: string[];
  hasChanges: boolean;
}

export class GitService {
  private get gitExtension(): vscode.Extension<any> | undefined {
    return vscode.extensions.getExtension('vscode.git');
  }

  private get git(): any | undefined {
    return this.gitExtension?.exports;
  }

  public async getStatus(): Promise<GitStatus> {
    const git = this.git;
    if (!git) {
      throw new Error('Git extension not available');
    }

    const repositories = git.repositories;
    if (repositories.length === 0) {
      throw new Error('No Git repository found');
    }

    const repository = repositories[0];
    const state = repository.state;

    const staged = state.indexChanges.map((change: vscode.SourceControlResourceState) => change.resourceUri.fsPath);
    const unstaged = state.workingTreeChanges.map((change: vscode.SourceControlResourceState) => change.resourceUri.fsPath);
    const untracked = state.untrackedChanges.map((change: vscode.SourceControlResourceState) => change.resourceUri.fsPath);

    return {
      staged,
      unstaged,
      untracked,
      hasChanges: staged.length > 0 || unstaged.length > 0 || untracked.length > 0
    };
  }

  public async commit(message: string, amend: boolean = false): Promise<void> {
    const git = this.git;
    if (!git) {
      throw new Error('Git extension not available');
    }

    const repositories = git.repositories;
    if (repositories.length === 0) {
      throw new Error('No Git repository found');
    }

    const repository = repositories[0];
    
    if (amend) {
      await repository.commit(message, { amend: true });
    } else {
      await repository.commit(message);
    }
  }

  public async stageFile(filePath: string): Promise<void> {
    const git = this.git;
    if (!git) {
      throw new Error('Git extension not available');
    }

    const repositories = git.repositories;
    if (repositories.length === 0) {
      throw new Error('No Git repository found');
    }

    const repository = repositories[0];
    await repository.add([filePath]);
  }

  public async unstageFile(filePath: string): Promise<void> {
    const git = this.git;
    if (!git) {
      throw new Error('Git extension not available');
    }

    const repositories = git.repositories;
    if (repositories.length === 0) {
      throw new Error('No Git repository found');
    }

    const repository = repositories[0];
    await repository.revert([filePath]);
  }
} 