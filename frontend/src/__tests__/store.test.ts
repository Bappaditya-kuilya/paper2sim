import { renderHook, act } from '@testing-library/react';
import { createStore } from '../lib/store';
describe('createStore', () => {
  it('returns initial value', () => { const store = createStore(42); expect(store.get()).toBe(42); });
  it('updates value', () => { const store = createStore(0); store.set(10); expect(store.get()).toBe(10); });
  it('notifies subscribers', () => { const store = createStore(0); const fn = vi.fn(); store.subscribe(fn); store.set(5); expect(fn).toHaveBeenCalledWith(5); });
});
