import { useCallback, useEffect, useRef, useState } from 'react';
import { api, resetBackendCheck } from '../lib/api';
import { isTerminal } from '../lib/jobs';
import type { Job, JobListItem } from '../types';

// Submits to POST /api/papers and polls GET /api/jobs/{id} every 2s (PRD §5).
export function useJobs() {
  const [jobs, setJobs] = useState<JobListItem[]>([]);
  const [active, setActive] = useState<Job | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [backendDown, setBackendDown] = useState(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPoll = useCallback(() => {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => stopPoll, [stopPoll]);

  const refreshList = useCallback(async () => {
    try {
      const res = await api.listJobs();
      setJobs(res.jobs);
    } catch { /* list is best-effort */ }
  }, []);

  const poll = useCallback(async (id: string) => {
    stopPoll();
    const tick = async () => {
      try {
        const job = await api.getJob(id);
        setActive(job);
        if (isTerminal(job.status)) {
          stopPoll();
          void refreshList();
        }
      } catch (e) {
        stopPoll();
        setError(e instanceof Error ? e.message : 'Job poll failed');
      }
    };
    await tick();
    timer.current = setInterval(tick, 2000);
  }, [refreshList, stopPoll]);

  const submit = useCallback(async (mode: string, value: string | File) => {
    setLoading(true);
    setError(null);
    setBackendDown(false);
    resetBackendCheck();
    try {
      const form = new FormData();
      if (mode === 'pdf' && value instanceof File) form.append('file', value);
      else if (mode === 'arxiv') form.append('arxiv', String(value));
      else form.append('text', String(value));
      const { job_id } = await api.submitPaper(form);
      await poll(job_id);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Submit failed';
      if (msg.includes('BACKEND_OFFLINE') || msg.includes('not available')) {
        setBackendDown(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [poll]);

  const open = useCallback(async (id: string) => {
    setError(null);
    try {
      setActive(await api.getJob(id));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    }
  }, []);

  return { jobs, active, loading, error, backendDown, submit, open, refreshList };
}
