import * as assert from 'assert';
import { GitService } from '../extension/GitService';

suite('Extension Test Suite', () => {
  test('GitService should be instantiable', () => {
    const gitService = new GitService();
    assert.ok(gitService);
  });
}); 