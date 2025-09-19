import * as vscode from 'vscode';
import { CommitKitPanel } from './CommitKitPanel';
import { GitService } from './GitService';

let gitService: GitService | undefined;

export function activate(context: vscode.ExtensionContext): void {
  gitService = new GitService();

  context.subscriptions.push(
    gitService,
    vscode.commands.registerCommand('commitkit.openCommitModal', () => {
      if (!gitService) {
        gitService = new GitService();
        context.subscriptions.push(gitService);
      }

      CommitKitPanel.createOrShow(context.extensionUri, gitService);
    })
  );
}

export function deactivate(): void {
  gitService?.dispose();
  gitService = undefined;
}
