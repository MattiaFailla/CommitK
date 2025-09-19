import { GitService, ChangeStatus } from '../extension/GitService';
import { extensions, Uri } from 'vscode';

describe('GitService', () => {
  let gitService: GitService;
  let repository: any;

  beforeEach(() => {
    const extension: any = extensions.getExtension('vscode.git');
    const api = extension?.exports.getAPI(1);
    repository = api.repositories[0];
    repository.state.indexChanges = [];
    repository.state.workingTreeChanges = [];
    repository.state.untrackedChanges = [];
    repository.inputBox.value = '';
    gitService = new GitService();
  });

  test('provides status snapshot with commit message', async () => {
    repository.inputBox.value = 'chore: tidy\n\nupdates';
    repository.state.indexChanges = [
      {
        resourceUri: Uri.file('/workspace/src/app.ts'),
        status: 0
      }
    ];

    const snapshot = await gitService.getStatusSnapshot();

    expect(snapshot.commitMessage).toEqual({ subject: 'chore: tidy', body: 'updates' });
    expect(snapshot.staged).toHaveLength(1);
    expect(snapshot.staged[0]?.status).toBe(ChangeStatus.INDEX_MODIFIED);
    expect(snapshot.stats.staged).toBe(1);
  });

  test('updateCommitMessage writes to input box', async () => {
    await gitService.updateCommitMessage({ subject: 'feat', body: 'details' });
    expect(repository.inputBox.value).toBe('feat\n\ndetails');
  });
});
