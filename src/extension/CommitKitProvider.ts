import * as vscode from 'vscode';
import * as path from 'path';
import { GitService } from './GitService';

export class CommitKitProvider implements vscode.WebviewViewProvider {
  private _view?: vscode.WebviewView;
  private readonly _gitService: GitService;

  constructor(private readonly _extensionUri: vscode.Uri) {
    this._gitService = new GitService();
  }

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ): void {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this._extensionUri, 'webview-dist')
      ]
    };

    webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

    this._setWebviewMessageListener(webviewView.webview);
  }

  public openCommitModal(): void {
    if (this._view) {
      this._view.show(true);
    } else {
      vscode.commands.executeCommand('commitkit.webview.focus');
    }
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const scriptUriOnDisk = vscode.Uri.joinPath(
      this._extensionUri,
      'webview-dist',
      'webview.js'
    );
    const scriptUri = webview.asWebviewUri(scriptUriOnDisk);

    const styleUriOnDisk = vscode.Uri.joinPath(
      this._extensionUri,
      'webview-dist',
      'index.css'
    );
    const styleUri = webview.asWebviewUri(styleUriOnDisk);

    return `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>CommitKit</title>
        <link rel="stylesheet" type="text/css" href="${styleUri}">
    </head>
    <body>
        <div id="root"></div>
        <script src="${scriptUri}"></script>
    </body>
    </html>`;
  }

  private _setWebviewMessageListener(webview: vscode.Webview): void {
    webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'getGitStatus':
            const status = await this._gitService.getStatus();
            webview.postMessage({
              command: 'gitStatus',
              data: status
            });
            break;
          case 'commit':
            try {
              await this._gitService.commit(message.data.message, message.data.amend);
              webview.postMessage({
                command: 'commitSuccess'
              });
              vscode.window.showInformationMessage('Commit successful!');
            } catch (error) {
              webview.postMessage({
                command: 'commitError',
                error: error instanceof Error ? error.message : 'Unknown error'
              });
            }
            break;
        }
      },
      undefined,
      []
    );
  }
} 