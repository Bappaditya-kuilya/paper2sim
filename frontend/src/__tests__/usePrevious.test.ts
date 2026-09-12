import { renderHook } from '@testing-library/react';
import { usePrevious } from '../hooks/usePrevious';
describe('usePrevious', () => {
  it('returns undefined on first render', () => { const { result } = renderHook(() => usePrevious('test')); expect(result.current).toBeUndefined(); });
});
