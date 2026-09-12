import { renderHook } from '@testing-library/react';
import { useOnline } from '../hooks/useOnline';
describe('useOnline', () => {
  it('returns a boolean', () => { const { result } = renderHook(() => useOnline()); expect(typeof result.current).toBe('boolean'); });
});
