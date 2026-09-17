import { useCallback, useEffect, useState } from 'react';
import { checkBackend, type Equation, type ExtractResponse } from './lib/extractApi';
import { hintFor, showDimensionToggle } from './lib/plotMeta';
import { InputTabs } from './components/InputTabs';
import { EqList } from './components/EqList';
import { Plot2D } from './components/Plot2D';
import { Viewer3D } from './components/Viewer3D';
import { ParamPanel } from './components/ParamPanel';
import {
  DEFAULT_VIEWER_PARAMS,
  type ParamPatch,
  type ViewerParams,
} from './lib/viewerParams';

type BackendState = 'checking' | 'up' | 'down';

function eqText(eq: Equation): string {
  const r = eq as unknown as Record<string, unknown>;
  const v = r['latex'] ?? r['equation'];
  return typeof v === 'string' ? v : '';
}

function eqType(eq: Equation): string {
  const r = eq as unknown as Record<string, unknown>;
  const v = r['type'];
  return typeof v === 'string' ? v : 'unknown';
}

function sampleEquations(): Equation[] {
  return [
    { latex: 'y = sin(k*x)', type: 'trigonometric' },
    { latex: 'y = x^2 + 2*x + 1', type: 'polynomial' },
  ] as unknown as Equation[];
}

function focusTabField() {
  document.getElementById('inputtabs-field')?.focus();
}

export default function App() {
  const [backend, setBackend] = useState<BackendState>('checking');
  const [busy, setBusy] = useState(false);
  const [equations, setEquations] = useState<Equation[]>([]);
  const [selected, setSelected] = useState(0);
  const [title, setTitle] = useState('');
  const [attempted, setAttempted] = useState(false);
  const [cause, setCause] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [params, setParams] = useState<ViewerParams>(DEFAULT_VIEWER_PARAMS);

  const runCheck = useCallback(async () => {
    setBackend('checking');
    try {
      const ok = await checkBackend();
      setBackend(ok ? 'up' : 'down');
    } catch {
      setBackend('down');
    }
  }, []);

  useEffect(() => {
    let live = true;
    checkBackend()
      .then((ok) => { if (live) setBackend(ok ? 'up' : 'down'); })
      .catch(() => { if (live) setBackend('down'); });
    return () => { live = false; };
  }, []);

  const handleResult = useCallback((r: ExtractResponse, t: string) => {
    const warning = r.warning;
    setEquations(r.equations ?? []);
    setSelected(0);
    setViewMode('2d');
    setTitle(t);
    setAttempted(true);
    setCause(typeof warning === 'string' && warning ? warning : null);
    setNotice(null);
    setCopied(false);
  }, []);

  const handleInlineError = useCallback((msg: string) => {
    setNotice(msg);
  }, []);

  const handleSample = useCallback(() => {
    setEquations(sampleEquations());
    setSelected(0);
    setViewMode('2d');
    setTitle('Sample');
    setAttempted(true);
    setCause(null);
    setNotice(null);
    setCopied(false);
  }, []);

  const handleSelect = useCallback((i: number) => {
    setSelected(i);
    setViewMode('2d');
  }, []);

  const handleParams = useCallback((patch: ParamPatch) => {
    setParams((p) => ({ ...p, ...patch }));
  }, []);

  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      setNotice('Copy failed — select the text manually.');
    }
  }, []);

  const selectedEq = equations[selected] ?? equations[0] ?? null;
  const status = busy ? 'Extracting…' : (notice ?? (attempted ? `${equations.length} equations${title ? ` — ${title}` : ''}` : ''));
  const showZero = attempted && !busy && equations.length === 0;

  return (
    <div className="min-h-screen bg-zinc-900 text-zinc-100">
      <main className="mx-auto w-full max-w-3xl px-4 py-6 md:py-8">
        <h1 className="mb-1 text-xl font-semibold">Equation to Plot</h1>
        <p className="mb-5 text-sm text-zinc-400">Paste any paper math, play with it live.</p>

        {backend === 'down' && (
          <div className="mb-4 rounded-lg border border-red-900/60 bg-red-950/30 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-red-200">Can&apos;t reach server</p>
              <button
                type="button"
                onClick={() => void runCheck()}
                className="min-h-[44px] rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        <InputTabs
          onResult={handleResult}
          onInlineError={handleInlineError}
          busy={busy}
          onBusy={setBusy}
          defaultSample={handleSample}
        />

        <p aria-live="polite" className="mt-3 min-h-[20px] text-sm text-zinc-400">
          {backend === 'checking' && !busy ? 'Checking server…' : status}
        </p>

        <div className="mt-4">
          {showZero ? (
            <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-6 text-center">
              <p className="text-sm font-medium text-zinc-200">No equations found</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-zinc-400">
                {cause ?? 'No extractable math detected in that input.'}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleSample}
                  className="min-h-[44px] rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  Try sample
                </button>
                <button
                  type="button"
                  onClick={focusTabField}
                  className="min-h-[44px] rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                >
                  Edit input
                </button>
              </div>
            </div>
          ) : (
            <>
              {equations.length > 0 && (
                <p className="mb-3 text-sm text-zinc-400">
                  {equations.length} equations{title ? ` — ${title}` : ''}
                </p>
              )}
              <EqList equations={equations} selected={selected} onSelect={handleSelect} loading={busy} />
              {selectedEq && !busy && (
                <section aria-label="Selected equation" className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                      {eqType(selectedEq)}
                    </span>
                  </div>
                  <p
                    role="img"
                    aria-label={`Selected equation: ${eqText(selectedEq)}`}
                    className="break-words font-mono text-sm text-zinc-100"
                  >
                    {eqText(selectedEq)}
                  </p>
                  <div className="mt-3">
                    {showDimensionToggle(eqType(selectedEq), eqText(selectedEq)) &&
                    !/d[A-Za-z]?\s*\/\s*d\s*x|\\frac\s*\{\s*d/.test(eqText(selectedEq)) ? (
                      <>
                        <div
                          role="radiogroup"
                          aria-label="Plot dimension"
                          className="mb-3 flex gap-2"
                        >
                          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-300 has-checked:border-zinc-400 has-checked:bg-zinc-900 has-checked:text-zinc-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-zinc-400">
                            <input
                              type="radio"
                              name="plot-dimension"
                              value="2d"
                              checked={viewMode === '2d'}
                              onChange={() => setViewMode('2d')}
                              className="h-4 w-4 accent-emerald-400"
                            />
                            2D
                          </label>
                          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-300 has-checked:border-zinc-400 has-checked:bg-zinc-900 has-checked:text-zinc-100 focus-within:outline-none focus-within:ring-2 focus-within:ring-zinc-400">
                            <input
                              type="radio"
                              name="plot-dimension"
                              value="3d"
                              checked={viewMode === '3d'}
                              onChange={() => setViewMode('3d')}
                              className="h-4 w-4 accent-emerald-400"
                            />
                            3D
                          </label>
                        </div>
                        {viewMode === '2d' ? (
                          <Plot2D equation={selectedEq} />
                        ) : (
                          <>
                            <Viewer3D
                              latex={eqText(selectedEq)}
                              xRange={params.xRange}
                              yRange={params.yRange}
                              resolution={params.resolution}
                              showGrid={params.showGrid}
                              showAxes={params.showAxes}
                              wireframe={params.wireframe}
                            />
                            <ParamPanel {...params} onChange={handleParams} />
                          </>
                        )}
                      </>
                    ) : (
                      <Plot2D equation={selectedEq} />
                    )}
                    <p className="mt-2 text-xs text-zinc-400">{hintFor(eqType(selectedEq))}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopy(eqText(selectedEq))}
                    className="mt-3 min-h-[44px] rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </section>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
