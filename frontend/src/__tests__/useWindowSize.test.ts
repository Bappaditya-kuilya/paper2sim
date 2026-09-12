import { renderHook } from '@testing-library/react';
import { useWindowSize } from '../hooks/useWindowSize';
describe('useWindowSize', () => {
  it('returns dimensions', () => { const { result } = renderHook(() => useWindowSize()); expect(result.current.width).toBeDefined(); expect(result.current.height).toBeDefined(); });
});
