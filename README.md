# CommitKit

A VSCode extension that replicates the PyCharm/JetBrains-style commit window.

## Features

- React webview with PyCharm-like commit UI
- Staged / Unstaged / Untracked sections
- Per-file Stage / Unstage actions
- Stage All / Unstage All toolbar
- Commit message with Amend option
- Open file from the list
- Refresh status and success/error feedback
- VSCode theme integration

## Getting Started

### Prerequisites
- Node.js 18+
- npm
- VSCode 1.85+

### Install dependencies
```bash
npm install
```

### Build
```bash
npm run build
```
This compiles the extension code and bundles the webview to `webview-dist/`.

### Run & Debug in VSCode
1. Open this folder in VSCode.
2. Press F5 to launch an Extension Development Host.
3. In the Dev Host, open a workspace with a Git repository.
4. Open Command Palette and run: `CommitKit: Open Commit Modal`.
5. Or open the SCM view; you’ll see a `CommitKit` view.

### Test
```bash
npm test
```
- Unit tests run with Jest and `ts-jest`.
- The `vscode` API is mocked under `src/__mocks__/vscode.ts`.

## Usage
1. Open a Git repo in the Dev Host.
2. Use `CommitKit: Open Commit Modal`.
3. Stage/Unstage files individually or via Stage All/Unstage All.
4. Type a commit message, optionally enable Amend, then Commit.
5. Click filenames to open them in the editor.

## Packaging
```bash
npm run build
npm run package
```
This creates a `.vsix` you can install via VSCode’s Extensions panel.

## Troubleshooting
- If Git isn’t detected, ensure the built-in `vscode.git` extension is enabled and you opened a folder with a Git repo.
- For webview changes, run `npm run watch` during development to hot-rebuild the web assets.

## License
MIT
