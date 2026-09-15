import { apiFetch, resetBackendCheck } from '../lib/api'

beforeEach(() => {
  resetBackendCheck()
  global.fetch = vi.fn()
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({}),
  } as Response)
})

test('apiFetch throws on non-ok response', async () => {
  vi.mocked(global.fetch)
    .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response) // health check
    .mockResolvedValueOnce({ ok: false, status: 500, text: async () => '' } as Response)  // first attempt
    .mockResolvedValueOnce({ ok: false, status: 500, text: async () => '' } as Response)  // retry attempt

  await expect(apiFetch('/test')).rejects.toThrow('API error 500')
})

test('checkBackend outlasts a cold start: two failures then success', async () => {
  vi.useFakeTimers()
  try {
    resetBackendCheck()
    vi.mocked(global.fetch)
      .mockRejectedValueOnce(new Error('asleep'))
      .mockRejectedValueOnce(new Error('waking'))
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) } as Response) // health
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({ ok: true }) } as Response) // api
    const p = apiFetch('/test')
    await vi.advanceTimersByTimeAsync(60000)
    await expect(p).resolves.toEqual({ ok: true })
    expect(vi.mocked(global.fetch).mock.calls.length).toBe(4)
  } finally {
    vi.useRealTimers()
  }
})

test('gives up after 5 health attempts, not 2', async () => {
  vi.useFakeTimers()
  try {
    resetBackendCheck()
    vi.mocked(global.fetch).mockRejectedValue(new Error('down'))
    const p = apiFetch('/test')
    await vi.advanceTimersByTimeAsync(120000)
    const err = await p.then(() => null, (e) => e as { code?: string })
    expect(err?.code).toBe('BACKEND_OFFLINE')
    expect(vi.mocked(global.fetch).mock.calls.length).toBe(5)
  } finally {
    vi.useRealTimers()
  }
})
