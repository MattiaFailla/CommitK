# CommitKit

CommitKit brings the JetBrains-style commit experience to VS Code. It pairs a rich React webview with a first-class Git integration so you can stage files, review diffs, and craft commits without leaving the editor.

## Feature Highlights

- Three-column change explorer grouping staged, unstaged, and untracked files
- Inline actions to stage/unstage, discard, or open any file, plus Stage/Unstage All shortcuts
- Live diff viewer with syntax-coloured hunks for the selected change
- Commit form with summary/body split, amend, sign-off, and optional commit & push in one click
- Git status synced with the built-in `vscode.git` extension, including branch/ahead/behind info
- Theme-aware UI that mirrors the JetBrains commit dialog

## Quick Start

### Prerequisites
- Node.js 18+
- npm
- VS Code 1.85 or newer with the built-in Git extension enabled

### Install & Build
```bash
npm install
npm run build
```
The build step compiles the extension host into `dist/` and bundles the webview into `webview-dist/`.

### Launch in VS Code
1. Open this workspace in VS Code.
2. Press <kbd>F5</kbd> to start an Extension Development Host.
3. In the Dev Host, open a folder that is a Git repository.
4. Run the `CommitKit: Open Commit Modal` command (or use the CommitKit button in the SCM view).

### Test & Verify
```bash
npm test          # Jest + ts-jest unit tests
npm run verify    # Full build followed by tests
```
Mocks for the VS Code API live in `src/__mocks__/vscode.ts` so tests can exercise the Git workflow.

## Project Layout

```
src/
├─ extension/     # Extension host (Git service, panel controller)
├─ webview/       # React UI compiled by Vite
├─ __tests__/     # Jest suites for extension + services
└─ __mocks__/     # VS Code API shims used in tests
```
Key configs—`tsconfig.extension.json`, `tsconfig.webview.json`, `vite.config.ts`, and `jest.config.js`—sit at the repository root.

## Packaging
```bash
npm run build
npm run package   # produces commitkit-*.vsix
```
Install the generated `.vsix` via the VS Code Extensions view (`…` ➜ *Install from VSIX*).

## Troubleshooting Tips

- **No repositories detected**: ensure the built-in `vscode.git` extension is enabled and the Dev Host opened a folder containing a Git repo.
- **UI not updating**: use the `Refresh` button in the header or run `CommitKit: Open Commit Modal` again to reload the panel.
- **Webview tweaks not appearing**: run `npm run watch` to rebuild on change or rerun `npm run build` before launching the Dev Host.

## Contributing

See [`AGENTS.md`](AGENTS.md) for contributor guidelines covering project structure, coding conventions, and pull request expectations.

## License
MIT
