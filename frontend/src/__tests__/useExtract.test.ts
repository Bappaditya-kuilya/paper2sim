import { renderHook } from '@testing-library/react'
import { useExtract } from '../hooks/useExtract'

test('hook initializes correctly', () => {
  const { result } = renderHook(() => useExtract())
  expect(result.current.equations).toEqual([])
  expect(result.current.loading).toBe(false)
  expect(result.current.error).toBeNull()
})

test('extract function exists', () => {
  const { result } = renderHook(() => useExtract())
  expect(typeof result.current.extract).toBe('function')
})
