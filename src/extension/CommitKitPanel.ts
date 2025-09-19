import * as vscode from 'vscode';
import { CommitMessage, CommitOptionFlags, ChangeStatus, GitService, StatusSnapshot } from './GitService';

type WebviewRequest =
  | { command: 'ready' }
  | { command: 'refreshStatus' }
  | { command: 'stage'; uri: string }
  | { command: 'unstage'; uri: string }
  | { command: 'stageAll' }
  | { command: 'unstageAll' }
  | { command: 'discard'; uri: string }
  | { command: 'openFile'; uri: string }
  | { command: 'updateCommitMessage'; payload: CommitMessage }
  | {
      command: 'commit';
      payload: {
        message: CommitMessage;
        options: CommitOptionFlags;
      };
    }
  | {
      command: 'selectChange';
      payload: {
        uri: string;
        staged: boolean;
        status: ChangeStatus;
        previousUri?: string;
      };
    };

type ExtensionNotification =
  | { command: 'statusUpdated'; snapshot: StatusSnapshot }
  | { command: 'statusError'; message: string }
  | { command: 'diffLoaded'; payload: { uri: string; staged: boolean; diff: string } }
  | { command: 'commitComplete' }
  | { command: 'error'; message: string }
  | { command: 'info'; message: string };

export class CommitKitPanel implements vscode.Disposable {
  public static currentPanel: CommitKitPanel | undefined;

  public static createOrShow(extensionUri: vscode.Uri, gitService: GitService): void {
    const column = vscode.window.activeTextEditor?.viewColumn ?? vscode.ViewColumn.One;

    if (CommitKitPanel.currentPanel) {
      CommitKitPanel.currentPanel.panel.reveal(column);
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'commitkit.panel',
      'Commit Changes',
      column,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'webview-dist')]
      }
    );

    CommitKitPanel.currentPanel = new CommitKitPanel(panel, extensionUri, gitService);
  }

  private readonly panel: vscode.WebviewPanel;
  private readonly extensionUri: vscode.Uri;
  private readonly gitService: GitService;
  private readonly disposables: vscode.Disposable[] = [];
  private isDisposed = false;

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, gitService: GitService) {
    this.panel = panel;
    this.extensionUri = extensionUri;
    this.gitService = gitService;

    this.panel.webview.html = this.getHtmlForWebview(this.panel.webview);
    this.disposables.push(
      this.panel.onDidDispose(() => this.dispose())
    );

    this.disposables.push(
      this.gitService.onDidChange(() => {
        this.postStatus();
      })
    );

    this.setWebviewMessageListener(this.panel.webview);
    this.postStatus();
  }

  public dispose(): void {
    if (this.isDisposed) {
      return;
    }

    this.isDisposed = true;
    CommitKitPanel.currentPanel = undefined;

    while (this.disposables.length > 0) {
      const disposable = this.disposables.pop();
      try {
        disposable?.dispose();
      } catch (error) {
        console.error('Failed to dispose CommitKitPanel resource', error);
      }
    }

    this.panel.dispose();
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'webview-dist', 'webview.js'));
    const styleUri = webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'webview-dist', 'index.css'));

    const nonce = this.getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CommitKit</title>
  <link rel="stylesheet" href="${styleUri}">
</head>
<body>
  <div id="root"></div>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private setWebviewMessageListener(webview: vscode.Webview): void {
    webview.onDidReceiveMessage(async (message: WebviewRequest) => {
      switch (message.command) {
        case 'ready': {
          await this.postStatus();
          break;
        }
        case 'refreshStatus': {
          await this.postStatus();
          break;
        }
        case 'stage': {
          await this.runWithStatusUpdate(() => this.gitService.stage(vscode.Uri.parse(message.uri)));
          break;
        }
        case 'unstage': {
          await this.runWithStatusUpdate(() => this.gitService.unstage(vscode.Uri.parse(message.uri)));
          break;
        }
        case 'stageAll': {
          await this.runWithStatusUpdate(() => this.gitService.stageAll());
          break;
        }
        case 'unstageAll': {
          await this.runWithStatusUpdate(() => this.gitService.unstageAll());
          break;
        }
        case 'discard': {
          await this.runWithStatusUpdate(() => this.gitService.discardChanges(vscode.Uri.parse(message.uri)));
          break;
        }
        case 'openFile': {
          await this.openFile(message.uri);
          break;
        }
        case 'updateCommitMessage': {
          await this.runSafely(() => this.gitService.updateCommitMessage(message.payload));
          break;
        }
        case 'commit': {
          await this.commit(message.payload.message, message.payload.options);
          break;
        }
        case 'selectChange': {
          await this.loadDiff(message.payload);
          break;
        }
        default: {
          // No-op for unknown commands
          break;
        }
      }
    }, undefined, this.disposables);
  }

  private async runWithStatusUpdate(action: () => Thenable<void>): Promise<void> {
    await this.runSafely(action);
    await this.postStatus();
  }

  private async runSafely(action: () => Thenable<void>): Promise<void> {
    try {
      await action();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.notifyError(message);
    }
  }

  private async openFile(uriAsString: string): Promise<void> {
    try {
      const uri = vscode.Uri.parse(uriAsString);
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc, { preview: true });
    } catch (error) {
      this.notifyError(error instanceof Error ? error.message : String(error));
    }
  }

  private async commit(message: CommitMessage, options: CommitOptionFlags): Promise<void> {
    try {
      await this.gitService.commit(message, options);
      this.postMessage({ command: 'commitComplete' });
      await this.postStatus();
      vscode.window.showInformationMessage('Commit created successfully.');
    } catch (error) {
      const messageText = error instanceof Error ? error.message : String(error);
      this.notifyError(messageText);
    }
  }

  private async loadDiff(payload: { uri: string; staged: boolean; status: ChangeStatus; previousUri?: string }): Promise<void> {
    try {
      const uri = vscode.Uri.parse(payload.uri);
      const previousUri = payload.previousUri ? vscode.Uri.parse(payload.previousUri) : undefined;
      const diff = await this.gitService.getDiff({
        uri,
        staged: payload.staged,
        status: payload.status,
        ...(previousUri ? { previousUri } : {})
      });

      this.postMessage({
        command: 'diffLoaded',
        payload: {
          uri: payload.uri,
          staged: payload.staged,
          diff
        }
      });
    } catch (error) {
      this.notifyError(error instanceof Error ? error.message : String(error));
    }
  }

  private async postStatus(): Promise<void> {
    if (this.isDisposed) {
      return;
    }

    try {
      const snapshot = await this.gitService.getStatusSnapshot();
      this.postMessage({ command: 'statusUpdated', snapshot });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.postMessage({ command: 'statusError', message });
    }
  }

  private notifyError(message: string): void {
    this.postMessage({ command: 'error', message });
    vscode.window.showErrorMessage(message);
  }

  private postMessage(message: ExtensionNotification): void {
    if (!this.isDisposed) {
      const result = this.panel.webview.postMessage(message);
      Promise.resolve(result).catch((error) => {
        console.error('Failed to post message to CommitKit webview', error);
      });
    }
  }

  private getNonce(): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let text = '';
    for (let i = 0; i < 32; i += 1) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }
}
