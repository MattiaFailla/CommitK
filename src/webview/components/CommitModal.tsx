import React, { useState } from 'react';
import { GitStatusData } from '../App';

interface CommitModalProps {
  gitStatus: GitStatusData;
  onCommit: (message: string, amend: boolean) => void;
}

export const CommitModal: React.FC<CommitModalProps> = ({ gitStatus, onCommit }) => {
  const [commitMessage, setCommitMessage] = useState('');
  const [amend, setAmend] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commitMessage.trim()) {
      onCommit(commitMessage.trim(), amend);
      setCommitMessage('');
    }
  };

  const stagedCount = gitStatus.staged.length;
  const unstagedCount = gitStatus.unstaged.length;
  const untrackedCount = gitStatus.untracked.length;

  return (
    <div className="commit-modal">
      <div className="modal-header">
        <h2>Commit Changes</h2>
        <div className="status-summary">
          {stagedCount > 0 && <span className="staged">{stagedCount} staged</span>}
          {unstagedCount > 0 && <span className="unstaged">{unstagedCount} unstaged</span>}
          {untrackedCount > 0 && <span className="untracked">{untrackedCount} untracked</span>}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="commit-form">
        <div className="form-group">
          <label htmlFor="commit-message">Commit Message:</label>
          <textarea
            id="commit-message"
            value={commitMessage}
            onChange={(e) => setCommitMessage(e.target.value)}
            placeholder="Enter your commit message..."
            rows={4}
            required
          />
        </div>

        <div className="form-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={amend}
              onChange={(e) => setAmend(e.target.checked)}
            />
            Amend previous commit
          </label>
        </div>

        <div className="form-actions">
          <button type="submit" className="commit-button" disabled={!commitMessage.trim()}>
            Commit
          </button>
        </div>
      </form>

      <div className="file-list">
        {stagedCount > 0 && (
          <div className="file-section">
            <h3>Staged Files</h3>
            <ul>
              {gitStatus.staged.map((file, index) => (
                <li key={index} className="staged-file">{file}</li>
              ))}
            </ul>
          </div>
        )}

        {unstagedCount > 0 && (
          <div className="file-section">
            <h3>Unstaged Files</h3>
            <ul>
              {gitStatus.unstaged.map((file, index) => (
                <li key={index} className="unstaged-file">{file}</li>
              ))}
            </ul>
          </div>
        )}

        {untrackedCount > 0 && (
          <div className="file-section">
            <h3>Untracked Files</h3>
            <ul>
              {gitStatus.untracked.map((file, index) => (
                <li key={index} className="untracked-file">{file}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}; 