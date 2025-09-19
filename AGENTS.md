# Repository Guidelines

## Project Structure & Module Organization
CommitKit is a VS Code extension composed of two parts. The extension host code lives in `src/extension` (`CommitKitProvider.ts`, `GitService.ts`, etc.) and is compiled to `dist/extension.js`. The React-based webview UI resides in `src/webview` with entry at `main.tsx` and static assets colocated. Shared mocks and tests sit under `src/__mocks__` and `src/__tests__`, while production bundles land in `dist` and `webview-dist`. Config files at the root (`tsconfig.*`, `vite.config.ts`, `jest.config.js`) drive TypeScript, Vite, and Jest.

## Build, Test, and Development Commands
- `npm install` sets up dependencies.
- `npm run build` compiles both the extension and webview outputs; use before packaging.
- `npm run watch` starts concurrent build watchers for rapid iteration.
- `npm test` runs the Jest suite; pair with `npm run test:watch` for TDD.
- `npm run lint`, `npm run lint:fix`, and `npm run type-check` enforce style and static analysis.
- `npm run package` / `npm run publish` call `vsce` for marketplace artifacts once everything passes.

## Coding Style & Naming Conventions
Source files are TypeScript with 2-space indentation. Favor small modules and keep domain logic in `src/extension`, UI logic in `src/webview`. Use PascalCase for React components and classes, camelCase for functions and variables, and suffix tests with `.test.ts`. ESLint (`npm run lint`) and Prettier settings keep formatting consistent; let the automated fixes run before committing.

## Testing Guidelines
Jest with `ts-jest` drives unit tests. Place specs in `src/__tests__` or alongside code using `*.test.ts`. Prefer mocking VS Code APIs with `src/__mocks__/vscode.ts`. Collect coverage via `npm test -- --coverage`; artifacts land in `coverage/`. Aim to cover new extension commands and webview interactions whenever you touch them.

## Commit & Pull Request Guidelines
Write imperative, descriptive commit subjects (e.g., “Add staged diff preview”). Group related changes and mention affected areas in the body when needed. For pull requests, include a concise summary, screenshots or GIFs of UI updates, and reference related issues. Confirm local `npm run verify` results before requesting review, and call out any follow-up work or testing gaps.
