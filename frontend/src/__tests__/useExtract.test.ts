import { renderHook, act } from '@testing-library/react'
import { api } from '../lib/api'
import { AppError } from '../lib/errors'
import { useExtract } from '../hooks/useExtract'

vi.mock('../lib/api', () => ({
  api: { extract: vi.fn(), extractUpload: vi.fn() },
  resetBackendCheck: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

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

test('extractUpload success tags vizMode', async () => {
  vi.mocked(api.extractUpload).mockResolvedValue({
    equations: [{ latex: 'x + y', type: 'function' }],
  } as never)
  const { result } = renderHook(() => useExtract())
  await act(async () => {
    await result.current.extractUpload(new File(['%PDF'], 'a.pdf', { type: 'application/pdf' }))
  })
  expect(result.current.equations[0].vizMode).toBe('3d')
  expect(result.current.error).toBeNull()
})

test('extractUpload BACKEND_OFFLINE sets backendDown + empty equations', async () => {
  vi.mocked(api.extractUpload).mockRejectedValue(
    new AppError('Backend server is not available. Please ensure the API server is running.', 'BACKEND_OFFLINE'),
  )
  const { result } = renderHook(() => useExtract())
  await act(async () => {
    await result.current.extractUpload(new File(['%PDF'], 'a.pdf', { type: 'application/pdf' }))
  })
  expect(result.current.backendDown).toBe(true)
  expect(result.current.equations).toEqual([])
})

test('extractUpload {error}-shaped response sets error state', async () => {
  vi.mocked(api.extractUpload).mockResolvedValue({ error: 'bad pdf' } as never)
  const { result } = renderHook(() => useExtract())
  await act(async () => {
    await result.current.extractUpload(new File(['%PDF'], 'a.pdf', { type: 'application/pdf' }))
  })
  expect(result.current.error).toBe('bad pdf')
})
