import { useEffect } from 'react';
import { PaperInput } from './PaperInput';
import { JobDetail } from './JobDetail';
import { useJobs } from '../hooks/useJobs';
import { showToast } from './Toast';

const SAMPLE = 'We claim Monte Carlo estimates of pi converge at O(1/sqrt(N)).';

// Simulate view (PRD §5-6): submit → live stepper → claim/verdict/3D + recent runs.
export function JobsView() {
  const { jobs, active, loading, error, backendDown, submit, open, refreshList, recheck } = useJobs();

  useEffect(() => {
    void refreshList();
  }, [refreshList]);

  useEffect(() => {
    if (error) showToast(error, 'error');
  }, [error]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PaperInput
        onAnalyze={(p) => void submit(p.mode, p.value)}
        onSample={() => void submit('equation', SAMPLE)}
        loading={loading}
      />
      {backendDown && !loading && (
        <div className="text-center">
          <p className="text-sm text-red-200">Can&apos;t reach the server — the free tier sleeps when idle. Wait a minute and retry.</p>
          <button
            onClick={() => void recheck()}
            className="mt-3 rounded-md bg-zinc-100 px-4 py-1.5 text-sm font-medium text-zinc-900 hover:bg-white"
          >
            Retry
          </button>
        </div>
      )}
      {active && <JobDetail job={active} />}
      {jobs.length > 0 && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <h3 className="mb-2 text-sm font-medium text-zinc-400">Recent runs</h3>
          <ul className="space-y-1">
            {jobs.map((j) => (
              <li key={j.id}>
                <button onClick={() => void open(j.id)} className="flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm hover:bg-zinc-900">
                  <span className="truncate text-zinc-200">{j.title || j.id}</span>
                  <span className="ml-3 shrink-0 text-xs text-zinc-500">{j.status}{j.verdict && j.verdict !== 'error' ? ` · ${j.verdict}` : ''}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
