import * as vscode from 'vscode';
import { CommitKitProvider } from './CommitKitProvider';

export function activate(context: vscode.ExtensionContext): void {
  const provider = new CommitKitProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.commands.registerCommand('commitkit.openCommitModal', () => {
      provider.openCommitModal();
    })
  );

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      'commitkit.webview',
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true
        }
      }
    )
  );
}

export function deactivate(): void {
  // Cleanup if needed
} 