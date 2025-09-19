import React from 'react';
import { ChangeItem } from '../types';

type DiffViewerProps = {
  change?: ChangeItem;
  diff?: string;
  loading?: boolean;
};

function classifyLine(line: string): string {
  if (line.startsWith('diff ') || line.startsWith('index ')) {
    return 'diff-header';
  }
  if (line.startsWith('---') || line.startsWith('+++')) {
    return 'diff-path';
  }
  if (line.startsWith('@@')) {
    return 'diff-hunk';
  }
  if (line.startsWith('+')) {
    return 'diff-added';
  }
  if (line.startsWith('-')) {
    return 'diff-removed';
  }
  return 'diff-context';
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ change, diff, loading }) => {
  if (!change) {
    return (
      <section className="diff-viewer">
        <div className="diff-placeholder">Select a file to preview its changes.</div>
      </section>
    );
  }

  return (
    <section className="diff-viewer">
      <header className="diff-header-bar">
        <div>
          <h2>{change.fileName}</h2>
          <span className="diff-path-sub">{change.relativePath}</span>
        </div>
        <span className="diff-status">{change.statusText}</span>
      </header>
      <div className="diff-content" aria-live="polite">
        {loading ? (
          <div className="diff-placeholder">Loading diff…</div>
        ) : diff && diff.length > 0 ? (
          <pre>
            {diff.split('\n').map((line, index) => (
              <span key={index} className={`diff-line ${classifyLine(line)}`}>
                {line === '' ? ' ' : line}
              </span>
            ))}
          </pre>
        ) : (
          <div className="diff-placeholder">No diff available.</div>
        )}
      </div>
    </section>
  );
};
