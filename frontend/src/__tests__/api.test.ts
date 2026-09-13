import { apiFetch } from '../lib/api'

beforeEach(() => {
  global.fetch = vi.fn()
  vi.mocked(global.fetch).mockResolvedValue({
    ok: true,
    status: 200,
  } as Response)
})

test('apiFetch throws on non-ok response', async () => {
  vi.mocked(global.fetch)
    .mockResolvedValueOnce({ ok: true, status: 200 } as Response)
    .mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => '',
    } as Response)

  await expect(apiFetch('/test')).rejects.toThrow('API error 500')
})
