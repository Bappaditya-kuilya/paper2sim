import type { ExtractResponse, RenderJob, BreakdownResponse } from '../types';
import { AppError } from './errors';

const API_BASE = import.meta.env.VITE_API_URL || '';

let backendAvailable: boolean | null = null;

async function checkBackend(): Promise<boolean> {
  if (backendAvailable !== null) return backendAvailable;
  try {
    const res = await fetch(`${API_BASE}/health`, { method: 'GET', signal: AbortSignal.timeout(3000) });
    backendAvailable = res.ok;
  } catch {
    backendAvailable = false;
  }
  return backendAvailable;
}

export async function apiFetch<T>(path: string, options?: RequestInit, retries = 1): Promise<T> {
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

  render: (body: { template: string; equation: string; params?: Record<string, number> }) =>
    apiFetch<{ job_id: string; status: string }>('/api/render', { method: 'POST', body: JSON.stringify(body) }),

  renderStatus: (jobId: string) =>
    apiFetch<RenderJob>(`/api/render/${jobId}/status`),

  renderVideo: (jobId: string) =>
    apiFetch<{ video_path: string }>(`/api/render/${jobId}/video`),

  breakdown: (body: { text?: string; model?: string }) =>
    apiFetch<BreakdownResponse>('/api/breakdown', { method: 'POST', body: JSON.stringify(body) }),
};
