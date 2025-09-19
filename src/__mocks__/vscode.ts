export type Uri = {
  fsPath: string;
  path?: string;
  toString: (skipEncoding?: boolean) => string;
};

const createUri = (input: string): Uri => ({
  fsPath: input,
  path: input,
  toString: () => input
});

export const Uri = {
  file: (fsPath: string) => createUri(fsPath),
  joinPath: (...parts: any[]) => {
    const resolved = parts
      .map((part) => (typeof part === 'string' ? part : part.fsPath ?? ''))
      .filter(Boolean)
      .join('/');
    return createUri(resolved);
  },
  parse: (value: string) => createUri(value.replace('file://', ''))
};

export const window = {
  showInformationMessage: jest.fn(),
  showErrorMessage: jest.fn(),
  showTextDocument: jest.fn(),
  createWebviewPanel: jest.fn(),
  activeTextEditor: undefined
};

export const workspace = {
  openTextDocument: jest.fn(async (uri: any) => ({ uri }))
};

const makeRepository = () => ({
  rootUri: createUri('/workspace'),
  state: {
    HEAD: { name: 'main', upstream: 'origin/main', ahead: 0, behind: 0 },
    indexChanges: [],
    workingTreeChanges: [],
    untrackedChanges: [],
    onDidChange: jest.fn(() => ({ dispose: jest.fn() }))
  },
  inputBox: { value: '' },
  add: jest.fn(async () => undefined),
  revert: jest.fn(async () => undefined),
  clean: jest.fn(async () => undefined),
  commit: jest.fn(async () => undefined),
  push: jest.fn(async () => undefined)
});

const repositories = [makeRepository()];

export const extensions = {
  getExtension: jest.fn(() => ({
    exports: {
      getAPI: (_version: number) => ({
        repositories,
        onDidOpenRepository: jest.fn(() => ({ dispose: jest.fn() })),
        onDidCloseRepository: jest.fn(() => ({ dispose: jest.fn() }))
      })
    }
  }))
};

export const __repositories = repositories;

export type Webview = any;
export type WebviewPanel = any;

export const commands = {
  registerCommand: jest.fn((_id: string, _cb: Function) => ({ dispose: jest.fn() }))
};

export const ViewColumn = {
  One: 1
};

export const EventEmitter = class<T> {
  private listener?: (value: T) => void;
  public event = (listener: (value: T) => void) => {
    this.listener = listener;
    return { dispose: jest.fn() };
  };
  public fire(value: T) {
    this.listener?.(value);
  }
  public dispose() {
    this.listener = undefined;
  }
};

export const Disposable = class {
  dispose = jest.fn();
};

export const version = '1.0.0';
