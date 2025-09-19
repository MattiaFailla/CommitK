export type ChangeStatus =
  | 'INDEX_MODIFIED'
  | 'INDEX_ADDED'
  | 'INDEX_DELETED'
  | 'INDEX_RENAMED'
  | 'INDEX_COPIED'
  | 'MODIFIED'
  | 'DELETED'
  | 'UNTRACKED'
  | 'IGNORED'
  | 'INTENT_TO_ADD'
  | 'ADDED_BY_US'
  | 'ADDED_BY_THEM'
  | 'DELETED_BY_US'
  | 'DELETED_BY_THEM'
  | 'BOTH_ADDED'
  | 'BOTH_DELETED'
  | 'BOTH_MODIFIED';

export type ChangeItem = {
  uri: string;
  previousUri?: string;
  relativePath: string;
  fileName: string;
  status: ChangeStatus;
  statusText: string;
  staged: boolean;
  isConflict: boolean;
  isUntracked: boolean;
};

export type CommitMessage = {
  subject: string;
  body: string;
};

export type StatusSnapshot = {
  branchName?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
  staged: ChangeItem[];
  unstaged: ChangeItem[];
  untracked: ChangeItem[];
  hasChanges: boolean;
  hasStaged: boolean;
  stats: {
    staged: number;
    unstaged: number;
    untracked: number;
  };
  commitMessage: CommitMessage;
};
