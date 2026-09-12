import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../hooks/useLocalStorage';
describe('useLocalStorage', () => {
  it('returns initial value', () => { const { result } = renderHook(() => useLocalStorage('test-key', 'initial')); expect(result.current[0]).toBe('initial'); });
  it('updates value', () => { const { result } = renderHook(() => useLocalStorage('test-key2', 'init')); act(() => { result.current[1]('updated'); }); expect(result.current[0]).toBe('updated'); });
});
