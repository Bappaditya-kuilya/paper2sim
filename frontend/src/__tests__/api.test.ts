import { apiFetch } from '../lib/api'

beforeEach(() => {
  global.fetch = vi.fn()
})

test('apiFetch throws on non-ok response', async () => {
  vi.mocked(global.fetch).mockResolvedValue({
    ok: false,
    status: 500,
  } as Response)

  await expect(apiFetch('/test')).rejects.toThrow('API error: 500')
})
