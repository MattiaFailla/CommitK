import React from 'react';
import { CommitMessage } from '../types';

type CommitFormProps = {
  message: CommitMessage;
  onMessageChange: (message: CommitMessage) => void;
  options: {
    amend: boolean;
    signoff: boolean;
  };
  onOptionsChange: (options: { amend: boolean; signoff: boolean }) => void;
  onCommit: (options?: { push?: boolean }) => void;
  busy: boolean;
  hasStaged: boolean;
};

const SUBJECT_LIMIT = 72;

export const CommitForm: React.FC<CommitFormProps> = ({
  message,
  onMessageChange,
  options,
  onOptionsChange,
  onCommit,
  busy,
  hasStaged
}) => {
  const remaining = SUBJECT_LIMIT - message.subject.length;
  const summaryTooLong = remaining < 0;

  const handleMessageChange = (field: keyof CommitMessage) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    onMessageChange({ ...message, [field]: event.target.value });
  };

  const toggleOption = (field: keyof typeof options) => (event: React.ChangeEvent<HTMLInputElement>) => {
    onOptionsChange({ ...options, [field]: event.target.checked });
  };

  const canCommit = hasStaged && Boolean(message.subject.trim()) && !summaryTooLong && !busy;

  return (
    <section className="commit-form">
      <header className="commit-form-header">
        <h2>Commit Message</h2>
        <span className={`subject-counter ${summaryTooLong ? 'over-limit' : ''}`}>
          {Math.max(0, remaining)} chars left
        </span>
      </header>
      <div className="form-field">
        <label htmlFor="commit-subject">Summary</label>
        <input
          id="commit-subject"
          type="text"
          value={message.subject}
          maxLength={120}
          onChange={handleMessageChange('subject')}
          placeholder="Write a short summary (72 char recommended)"
        />
      </div>
      <div className="form-field">
        <label htmlFor="commit-body">Description</label>
        <textarea
          id="commit-body"
          value={message.body}
          rows={6}
          onChange={handleMessageChange('body')}
          placeholder="Describe the changes (optional)"
        />
      </div>
      <div className="form-options">
        <label className="checkbox">
          <input type="checkbox" checked={options.amend} onChange={toggleOption('amend')} />
          Amend previous commit
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={options.signoff} onChange={toggleOption('signoff')} />
          Add Signed-off-by
        </label>
      </div>
      <div className="form-actions">
        <button type="button" className="secondary" onClick={() => onCommit({ push: true })} disabled={!canCommit}>
          Commit &amp; Push
        </button>
        <button type="button" className="primary" onClick={() => onCommit()} disabled={!canCommit}>
          {busy ? 'Committing…' : 'Commit'}
        </button>
      </div>
    </section>
  );
};
