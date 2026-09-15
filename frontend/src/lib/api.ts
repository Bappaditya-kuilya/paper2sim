import type { ExtractResponse, BreakdownResponse, Job, JobListItem } from '../types';
import { AppError } from './errors';

const API_BASE = import.meta.env.VITE_API_URL || '';

let backendAvailable: boolean | null = null;

// Render free tier sleeps when idle; wake takes 30-50s. Cover it: 5 tries,
// 10s timeout each, 2/4/6/8s backoff (~70s worst case) before declaring offline.
const HEALTH_TRIES = 5;
const HEALTH_TIMEOUT = 10000;

async function checkBackend(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  for (let i = 0; i < HEALTH_TRIES; i++) {
    try {
      const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(HEALTH_TIMEOUT) });
      if (res.ok) { backendAvailable = true; return true; }
    } catch { /* backoff below */ }
    if (i < HEALTH_TRIES - 1) await new Promise(r => setTimeout(r, 2000 * (i + 1)));
  }
  backendAvailable = false;
  return false;
}

export function resetBackendCheck() { backendAvailable = null; }

export async function apiFetch<T>(path: string, options?: RequestInit, retries = 2): Promise<T> {
  const available = await checkBackend();
  if (!available) {
    throw new AppError('Backend server is not available. Please ensure the API server is running.', 'BACKEND_OFFLINE');
  }

  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: { 'Content-Type': 'application/json', ...options?.headers },
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        throw new AppError(`API error ${res.status}: ${body}`, String(res.status));
      }
      return res.json();
    } catch (e) {
      if (e instanceof AppError && e.code === 'BACKEND_OFFLINE') throw e;
      if (i === retries - 1) throw e;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw new AppError('Max retries exceeded');
}

export const api = {
  extract: (body: { source: string; url?: string; text?: string }) =>
    apiFetch<ExtractResponse>('/api/extract', { method: 'POST', body: JSON.stringify(body) }),

  extractUpload: async (file: File): Promise<ExtractResponse> => {
    const available = await checkBackend();
    if (!available) {
      throw new AppError('Backend server is not available. Please ensure the API server is running.', 'BACKEND_OFFLINE');
    }
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/api/extract/upload`, { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new AppError(`API error ${res.status}: ${body}`, String(res.status));
    }
    return res.json();
  },

  breakdown: (body: { text?: string; model?: string }) =>
    apiFetch<BreakdownResponse>('/api/breakdown', { method: 'POST', body: JSON.stringify(body) }),

  submitPaper: async (form: FormData): Promise<{ job_id: string }> => {
    const available = await checkBackend();
    if (!available) {
      throw new AppError('Backend server is not available. Please ensure the API server is running.', 'BACKEND_OFFLINE');
    }
    const res = await fetch(`${API_BASE}/api/papers`, { method: 'POST', body: form });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new AppError(`API error ${res.status}: ${body}`, String(res.status));
    }
    return res.json();
  },

  listJobs: () => apiFetch<{ jobs: JobListItem[] }>('/api/jobs'),

  getJob: (id: string) => apiFetch<Job>(`/api/jobs/${id}`),

  artifactUrl: (id: string, fname: string) => `${API_BASE}/api/jobs/${id}/artifacts/${fname}`,
};
