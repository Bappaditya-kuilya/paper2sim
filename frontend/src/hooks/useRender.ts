import { useState } from 'react';
import { api } from '../lib/api';
import type { RenderJob } from '../types';

export function useRender() {
  const [job, setJob] = useState<RenderJob | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startRender = async (template: string, equation: string, params?: Record<string, number>) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.render({ template, equation, params });
      setJob({ job_id: res.job_id, status: 'queued', progress: 0 });
      return res.job_id;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Render failed');
      return null;
    } finally {
      setLoading(false);
    }
  };

  const pollStatus = async (jobId: string) => {
    try {
      const res = await api.renderStatus(jobId);
      setJob(res);
      return res;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Status check failed');
      return null;
    }
  };

  return { job, loading, error, startRender, pollStatus };
}
