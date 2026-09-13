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
