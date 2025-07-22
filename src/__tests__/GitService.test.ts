import { GitService } from '../extension/GitService';

describe('GitService', () => {
  let gitService: GitService;

  beforeEach(() => {
    gitService = new GitService();
  });

  test('should be instantiable', () => {
    expect(gitService).toBeDefined();
  });

  test('should have getStatus method', () => {
    expect(typeof gitService.getStatus).toBe('function');
  });

  test('should have commit method', () => {
    expect(typeof gitService.commit).toBe('function');
  });
}); 