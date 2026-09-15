import { MathSurface } from './sandbox/RendererSelector';
import { Sandbox3D } from './sandbox/Sandbox3D';
import { TrajectoryRenderer } from './sandbox/TrajectoryRenderer';
import { api } from '../lib/api';
import { JOB_STEPS, jobStepIndex } from '../lib/jobs';
import type { Job } from '../types';

const VERDICT_STYLE: Record<string, string> = {
  supported: 'border-green-800 bg-green-950/40 text-green-200',
  refuted: 'border-red-800 bg-red-950/40 text-red-200',
  inconclusive: 'border-yellow-800 bg-yellow-950/40 text-yellow-200',
  error: 'border-red-900 bg-red-950/40 text-red-200',
};

// Job detail (PRD §6.3): stepper, claim+plan, 3D viewport, metrics, verdict, code/stderr collapsed.
export function JobDetail({ job }: { job: Job }) {
  const step = jobStepIndex(job.status);
  const failed = job.status === 'failed';
  const scene = job.scene;
  const metrics = job.execution?.result_json?.metrics as Record<string, unknown> | undefined;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <ol className="flex items-center gap-1" aria-label="Pipeline progress">
        {JOB_STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-1">
            <span
              className={`flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium ${
                failed && i === step
                  ? 'bg-red-900 text-red-100'
                  : i < step || job.status === 'completed'
                    ? 'bg-green-900 text-green-100'
                    : i === step
                      ? 'bg-zinc-100 text-zinc-900'
                      : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {s}
            </span>
          </li>
        ))}
      </ol>

      {job.status === 'completed' && job.verdict && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${VERDICT_STYLE[job.verdict] ?? VERDICT_STYLE.error}`}>
          Verdict: {job.verdict} — {job.summary}
        </div>
      )}
      {failed && (
        <div className="rounded-lg border border-red-900 bg-red-950/40 px-4 py-3 text-sm text-red-200">
          Failed: {job.error}
          <button onClick={() => window.location.reload()} className="ml-3 underline">Retry</button>
        </div>
      )}

      {job.analysis && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <h3 className="text-sm font-medium text-zinc-400">Claim</h3>
          <p className="mt-1 text-sm text-zinc-100">{job.analysis.claim}</p>
          {job.analysis.simulation_plan && (
            <p className="mt-2 text-xs text-zinc-400">Plan: {job.analysis.simulation_plan}</p>
          )}
        </div>
      )}

      {scene && (
        <div>
          <h3 className="mb-3 text-sm font-medium text-zinc-400">Interactive 3D</h3>
          <div className="h-96">
            <Sandbox3D>
              {scene.type === 'trajectory' ? (
                <TrajectoryRenderer trajectory={scene.extra?.trajectory} vectors={scene.extra?.vectors} />
              ) : (
                <MathSurface
                  expression={scene.expression}
                  modelType={scene.type}
                  xRange={scene.x_range}
                  yRange={scene.y_range}
                  resolution={scene.resolution}
                  coefficients={scene.coefficients}
                />
              )}
            </Sandbox3D>
          </div>
        </div>
      )}

      {job.execution && job.execution.artifacts.length > 0 && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {job.execution.artifacts.map((a) => {
            const fname = a.split('/').pop()!;
            return <img key={a} src={api.artifactUrl(job.id, fname)} alt={fname} className="rounded-lg border border-zinc-800" />;
          })}
        </div>
      )}

      {metrics && Object.keys(metrics).length > 0 && (
        <table className="w-full text-sm">
          <tbody>
            {Object.entries(metrics).map(([k, v]) => (
              <tr key={k} className="border-b border-zinc-800">
                <td className="py-1 pr-4 text-zinc-400">{k}</td>
                <td className="py-1 font-mono text-zinc-100">{String(v)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {job.code && (
        <details className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <summary className="cursor-pointer text-sm text-zinc-400">Generated code</summary>
          <pre className="mt-2 overflow-x-auto font-mono text-xs text-zinc-300">{job.code}</pre>
        </details>
      )}
      {job.execution && (job.execution.stdout || job.execution.stderr) && (
        <details className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
          <summary className="cursor-pointer text-sm text-zinc-400">stdout / stderr</summary>
          <pre className="mt-2 overflow-x-auto font-mono text-xs text-zinc-500">{job.execution.stderr || job.execution.stdout}</pre>
        </details>
      )}
    </div>
  );
}
