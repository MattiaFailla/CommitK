import React from 'react';

const glyph = {
  ahead: '↑',
  behind: '↓'
};

type HeaderBarProps = {
  branchName?: string;
  upstream?: string;
  ahead?: number;
  behind?: number;
  stats: {
    staged: number;
    unstaged: number;
    untracked: number;
  };
  onRefresh: () => void;
  busy?: boolean;
};

export const HeaderBar: React.FC<HeaderBarProps> = ({ branchName, upstream, ahead = 0, behind = 0, stats, onRefresh, busy }) => {
  return (
    <header className="app-header">
      <div className="branch-info">
        <span className="branch-name">{branchName ?? 'HEAD (detached)'}</span>
        {upstream && <span className="upstream">↔ {upstream}</span>}
        {(ahead > 0 || behind > 0) && (
          <span className="ahead-behind">
            {ahead > 0 && (
              <span title={`${ahead} commits ahead`}>{glyph.ahead} {ahead}</span>
            )}
            {behind > 0 && (
              <span title={`${behind} commits behind`}>{glyph.behind} {behind}</span>
            )}
          </span>
        )}
      </div>
      <div className="header-right">
        <div className="change-counters">
          <span title="Staged files">{stats.staged} staged</span>
          <span title="Unstaged files">{stats.unstaged} unstaged</span>
          <span title="Untracked files">{stats.untracked} untracked</span>
        </div>
        <button className="secondary" onClick={onRefresh} disabled={busy}>
          Refresh
        </button>
      </div>
    </header>
  );
};
