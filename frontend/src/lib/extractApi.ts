export interface Equation {
  latex: string;
  type: string;
  label?: string;
}

export interface ExtractResponse {
  equations: Equation[];
  warning?: string;
}

export interface ArxivResponse {
  title: string;
  authors: string[];
  equations: Equation[];
}

export interface SampleClaim {
  id: string;
  title: string;
  equations: Equation[];
}

export function apiBase(): string {
  return (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');
}

let backendAvailable: boolean | null = null;

// Render free tier sleeps when idle; wake takes 30-50s. Cover it: 5 tries,
// 10s timeout each, 2/4/6/8s backoff (~70s worst case) before declaring offline.
const HEALTH_TRIES = 5;
const HEALTH_TIMEOUT = 10000;

export async function checkBackend(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  for (let i = 0; i < HEALTH_TRIES; i++) {
    try {
      const res = await fetch(`${apiBase()}/health`, { method: 'GET', signal: AbortSignal.timeout(HEALTH_TIMEOUT) });
      if (res.ok) { backendAvailable = true; return true; }
    } catch { /* backoff below */ }
    if (i < HEALTH_TRIES - 1) await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  backendAvailable = false;
  return false;
}

async function errorDetail(res: Response): Promise<string> {
  const fallback: string = `HTTP ${res.status}`;
  let text: string;
  try {
    text = await res.text();
  } catch {
    return fallback;
  }
  if (!text) return fallback;
  try {
    const data: unknown = JSON.parse(text);
    if (typeof data === 'object' && data !== null) {
      const record = data as Record<string, unknown>;
      for (const key of ['detail', 'message', 'error']) {
        const value: unknown = record[key];
        if (typeof value === 'string' && value.length > 0) return value;
      }
    }
    return text.slice(0, 300);
  } catch {
    return text.slice(0, 300);
  }
}

export async function extractText(value: string): Promise<ExtractResponse> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'text', value }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err: unknown) {
    if ((err as Error)?.name === 'TimeoutError') throw new Error('Request timed out');
    throw new Error('Could not reach the extraction server. Check your connection and try again.');
  }
  if (!res.ok) {
    const detail: string = await errorDetail(res);
    throw new Error(`Text extraction failed (${res.status}): ${detail}`);
  }
  try {
    return (await res.json()) as ExtractResponse;
  } catch {
    throw new Error('Bad response from server');
  }
}

export async function extractArxiv(url: string): Promise<ExtractResponse> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source: 'arxiv_url', value: url }),
      signal: AbortSignal.timeout(30000),
    });
  } catch (err: unknown) {
    if ((err as Error)?.name === 'TimeoutError') throw new Error('Request timed out');
    throw new Error('Could not reach the extraction server. Check your connection and try again.');
  }
  if (!res.ok) {
    const detail: string = await errorDetail(res);
    throw new Error(`arXiv extraction failed (${res.status}): ${detail}`);
  }
  try {
    return (await res.json()) as ExtractResponse;
  } catch {
    throw new Error('Bad response from server');
  }
}

export async function extractUpload(file: File): Promise<ExtractResponse> {
  const form: FormData = new FormData();
  form.append('file', file);
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/extract/upload`, { method: 'POST', body: form, signal: AbortSignal.timeout(30000) });
  } catch (err: unknown) {
    if ((err as Error)?.name === 'TimeoutError') throw new Error('Request timed out');
    throw new Error('Could not reach the extraction server. Check your connection and try again.');
  }
  if (!res.ok) {
    const detail: string = await errorDetail(res);
    throw new Error(`PDF extraction failed (${res.status}): ${detail}`);
  }
  try {
    return (await res.json()) as ExtractResponse;
  } catch {
    throw new Error('Bad response from server');
  }
}

export async function fetchArxiv(url: string): Promise<ArxivResponse> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/arxiv?url=${encodeURIComponent(url)}`, { method: 'GET', signal: AbortSignal.timeout(30000) });
  } catch (err: unknown) {
    if ((err as Error)?.name === 'TimeoutError') throw new Error('Request timed out');
    throw new Error('Could not reach the arXiv lookup server. Check your connection and try again.');
  }
  if (!res.ok) {
    const detail: string = await errorDetail(res);
    throw new Error(`arXiv lookup failed (${res.status}): ${detail}`);
  }
  try {
    return (await res.json()) as ArxivResponse;
  } catch {
    throw new Error('Bad response from server');
  }
}

export const SAMPLES: SampleClaim[] = [
  {
    id: 'sample-basic',
    title: 'Sample equations (offline)',
    equations: [
      { latex: 'sin(x) + cos(y)', type: 'trigonometric' },
      { latex: 'E = mc^2', type: 'physics' },
    ],
  },
];
