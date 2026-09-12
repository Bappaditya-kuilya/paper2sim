import { renderHook } from '@testing-library/react'
import { useRender } from '../hooks/useRender'

test('hook initializes correctly', () => {
  const { result } = renderHook(() => useRender())
  expect(result.current.job).toBeNull()
  expect(result.current.loading).toBe(false)
  expect(result.current.error).toBeNull()
})

test('startRender function exists', () => {
  const { result } = renderHook(() => useRender())
  expect(typeof result.current.startRender).toBe('function')
})
