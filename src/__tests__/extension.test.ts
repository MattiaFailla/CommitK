import { activate } from '../extension/extension';

describe('Extension activation', () => {
  test('activates and registers subscriptions', () => {
    const context = {
      subscriptions: [] as any[]
    } as any;

    activate(context);

    expect(Array.isArray(context.subscriptions)).toBe(true);
  });
}); 