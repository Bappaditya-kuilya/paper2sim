import { renderHook, act } from '@testing-library/react';
import { useDebounce } from '../hooks/useDebounce';
describe('useDebounce', () => {
  it('returns initial value', () => { const { result } = renderHook(() => useDebounce('test', 500)); expect(result.current).toBe('test'); });
  it('debounces value change', async () => { const { result, rerender } = renderHook(({ val, delay }) => useDebounce(val, delay), { initialProps: { val: 'a', delay: 50 } }); rerender({ val: 'b', delay: 50 }); expect(result.current).toBe('a'); });
});
