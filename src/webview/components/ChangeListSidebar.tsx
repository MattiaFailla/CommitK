import React from 'react';
import { ChangeItem } from '../types';

type SectionType = 'staged' | 'unstaged' | 'untracked';

type ChangeListSidebarProps = {
  staged: ChangeItem[];
  unstaged: ChangeItem[];
  untracked: ChangeItem[];
  selected?: ChangeItem;
  onSelect: (change: ChangeItem) => void;
  onOpenFile: (change: ChangeItem) => void;
  onStage: (change: ChangeItem) => void;
  onUnstage: (change: ChangeItem) => void;
  onDiscard: (change: ChangeItem) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
};

const statusBadgeMap: Record<string, string> = {
  INDEX_MODIFIED: 'M',
  INDEX_ADDED: 'A',
  INDEX_DELETED: 'D',
  INDEX_RENAMED: 'R',
  INDEX_COPIED: 'C',
  MODIFIED: 'M',
  DELETED: 'D',
  UNTRACKED: 'U',
  IGNORED: 'I',
  INTENT_TO_ADD: '+',
  ADDED_BY_US: '⚠',
  ADDED_BY_THEM: '⚠',
  DELETED_BY_US: '⚠',
  DELETED_BY_THEM: '⚠',
  BOTH_ADDED: '⚠',
  BOTH_DELETED: '⚠',
  BOTH_MODIFIED: '⚠'
};

function getBadge(status: string): string {
  return statusBadgeMap[status] ?? '?';
}

function ChangeSection({
  title,
  items,
  type,
  selected,
  onSelect,
  onOpenFile,
  onStage,
  onUnstage,
  onDiscard,
  onStageAll,
  onUnstageAll
}: {
  title: string;
  items: ChangeItem[];
  type: SectionType;
  selected?: ChangeItem;
  onSelect: (change: ChangeItem) => void;
  onOpenFile: (change: ChangeItem) => void;
  onStage: (change: ChangeItem) => void;
  onUnstage: (change: ChangeItem) => void;
  onDiscard: (change: ChangeItem) => void;
  onStageAll: () => void;
  onUnstageAll: () => void;
}): React.JSX.Element {
  const showStageAll = type !== 'staged' && items.length > 0;
  const showUnstageAll = type === 'staged' && items.length > 0;

  return (
    <section className="changes-section">
      <div className="section-header">
        <h3>{title}</h3>
        <div className="section-header-actions">
          {showStageAll && (
            <button className="mini-button" onClick={onStageAll} title="Stage all">
              Stage All
            </button>
          )}
          {showUnstageAll && (
            <button className="mini-button" onClick={onUnstageAll} title="Unstage all">
              Unstage All
            </button>
          )}
        </div>
      </div>
      {items.length === 0 ? (
        <div className="section-empty">No files</div>
      ) : (
        <ul className="change-list">
          {items.map((item) => {
            const isSelected = selected?.uri === item.uri;
            return (
              <li key={item.uri} className={`change-row ${isSelected ? 'selected' : ''}`}>
                <button className="change-row-main" onClick={() => onSelect(item)} onDoubleClick={() => onOpenFile(item)}>
                  <span className={`change-badge ${item.isConflict ? 'conflict' : ''}`}>{getBadge(item.status)}</span>
                  <span className="change-text">
                    <span className="change-file">{item.fileName}</span>
                    <span className="change-path">{item.relativePath}</span>
                  </span>
                </button>
                <div className="change-row-actions">
                  <button className="mini-button" onClick={() => onOpenFile(item)} title="Open file">
                    Open
                  </button>
                  {type === 'staged' ? (
                    <button className="mini-button" onClick={() => onUnstage(item)} title="Unstage file">
                      Unstage
                    </button>
                  ) : (
                    <button className="mini-button" onClick={() => onStage(item)} title="Stage file">
                      Stage
                    </button>
                  )}
                  {type !== 'staged' && (
                    <button className="mini-button danger" onClick={() => onDiscard(item)} title="Discard changes">
                      Discard
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

export const ChangeListSidebar: React.FC<ChangeListSidebarProps> = ({
  staged,
  unstaged,
  untracked,
  selected,
  onSelect,
  onOpenFile,
  onStage,
  onUnstage,
  onDiscard,
  onStageAll,
  onUnstageAll
}) => {
  return (
    <aside className="changes-sidebar">
      <ChangeSection
        title={`Staged • ${staged.length}`}
        type="staged"
        items={staged}
        selected={selected}
        onSelect={onSelect}
        onOpenFile={onOpenFile}
        onStage={onStage}
        onUnstage={onUnstage}
        onDiscard={onDiscard}
        onStageAll={onStageAll}
        onUnstageAll={onUnstageAll}
      />
      <ChangeSection
        title={`Unstaged • ${unstaged.length}`}
        type="unstaged"
        items={unstaged}
        selected={selected}
        onSelect={onSelect}
        onOpenFile={onOpenFile}
        onStage={onStage}
        onUnstage={onUnstage}
        onDiscard={onDiscard}
        onStageAll={onStageAll}
        onUnstageAll={onUnstageAll}
      />
      <ChangeSection
        title={`Untracked • ${untracked.length}`}
        type="untracked"
        items={untracked}
        selected={selected}
        onSelect={onSelect}
        onOpenFile={onOpenFile}
        onStage={onStage}
        onUnstage={onUnstage}
        onDiscard={onDiscard}
        onStageAll={onStageAll}
        onUnstageAll={onUnstageAll}
      />
    </aside>
  );
};
