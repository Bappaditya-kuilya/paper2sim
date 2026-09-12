import { renderHook } from '@testing-library/react';
import { useIntersectionObserver } from '../hooks/useIntersectionObserver';
describe('useIntersectionObserver', () => {
  it('returns ref and isVisible', () => { const { result } = renderHook(() => useIntersectionObserver()); expect(result.current.ref).toBeDefined(); expect(result.current.isVisible).toBe(false); });
});
