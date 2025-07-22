# CommitKit

A VSCode extension that replicates the Git commit modal from JetBrains IDEs (like PyCharm).

## Features

- Modern React-based webview interface
- Real-time Git status monitoring
- Staged/unstaged file management
- Commit message editor with amend support
- VSCode theme integration
- Fast development with Vite

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- VSCode

### Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```

4. Open the project in VSCode and press F5 to run the extension

### Development Scripts

- `npm run build` - Build both extension and webview
- `npm run watch` - Watch mode for development
- `npm run test` - Run tests
- `npm run lint` - Lint code
- `npm run package` - Package extension for distribution

### Project Structure

```
src/
├── extension/          # Extension backend (TypeScript)
│   ├── extension.ts   # Main entry point
│   ├── CommitKitProvider.ts
│   └── GitService.ts
└── webview/           # React webview (TypeScript + React)
    ├── index.html
    ├── main.tsx
    ├── App.tsx
    ├── style.css
    └── components/
        └── CommitModal.tsx
```

## Usage

1. Open a Git repository in VSCode
2. Use the command palette: `CommitKit: Open Commit Modal`
3. Or click the CommitKit button in the SCM view
4. Write your commit message and click Commit

## Building for Distribution

```bash
npm run build
npm run package
```

This creates a `.vsix` file that can be installed in VSCode.

## License

MIT
