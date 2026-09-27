import { afterEach, describe, expect, test, vi } from 'vitest';

async function loadCheckBackend(): Promise<() => Promise<boolean>> {
  vi.resetModules();
  const mod = await import('../lib/extractApi');
  return mod.checkBackend;
}

describe('checkBackend', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  test('accepts a 200 JSON {"status":"ok"} payload', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"status":"ok"}', { status: 200 })));
    const checkBackend = await loadCheckBackend();
    await expect(checkBackend()).resolves.toBe(true);
  });

  test('rejects a 200 HTML response (dev SPA fallback)', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('<!doctype html><html><body></body></html>', { status: 200 })),
    );
    const checkBackend = await loadCheckBackend();
    const result = checkBackend();
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe(false);
  });

  test('rejects a 200 JSON payload with a non-ok status', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"status":"degraded"}', { status: 200 })));
    const checkBackend = await loadCheckBackend();
    const result = checkBackend();
    await vi.runAllTimersAsync();
    await expect(result).resolves.toBe(false);
  });
});
