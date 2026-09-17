import { Component, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { checkBackend, type Equation, type ExtractResponse } from './lib/extractApi';
import { hintFor, showDimensionToggle } from './lib/plotMeta';
import { PALETTE, duplicateRow, newRow, toggleRow, type Row } from './lib/expressionRows';
import { DEFAULT_VIEWPORT, panViewport, zoomViewport, type Viewport } from './lib/viewport';
import { InputTabs } from './components/InputTabs';
import { ExpressionList } from './components/ExpressionList';
import { MultiPlot2D } from './components/MultiPlot2D';
import { ParamSliders } from './components/ParamSliders';
import { centerRangeOn, findJumpTarget, isInequalityLatex, RegionPlot } from './components/RegionPlot';
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

function toRows(equations: Equation[]): { rows: Row[]; types: Record<string, string> } {
  const rows: Row[] = [];
  const types: Record<string, string> = {};
  equations.forEach((eq, i) => {
    const row = newRow(eqText(eq), PALETTE[i % PALETTE.length] as string);
    rows.push(row);
    types[row.id] = eqType(eq);
  });
  return { rows, types };
}

type PlotErrorBoundaryProps = { paper: string; index: number; type: string; latex: string; children: ReactNode };
type PlotErrorBoundaryState = { failed: boolean; fails: number };

export class PlotErrorBoundary extends Component<PlotErrorBoundaryProps, PlotErrorBoundaryState> {
  state: PlotErrorBoundaryState = { failed: false, fails: 0 };
  static getDerivedStateFromError(): Partial<PlotErrorBoundaryState> { return { failed: true }; }
  componentDidCatch(): void {
    this.setState((s) => ({ fails: s.fails + 1 }));
    console.error({ paper: this.props.paper, index: this.props.index, type: this.props.type });
  }
  render() {
    if (!this.state.failed) return this.props.children;
    const disabled = this.state.fails >= 2;
    return (
      <div className="min-w-0 rounded-lg border border-white/10 bg-surface p-4 tabular-nums">
        <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-gray-300">Plot failed</span>
        <p className="mt-2 break-words font-mono text-sm tabular-nums text-white">{this.props.latex}</p>
        <button type="button" disabled={disabled} onClick={() => this.setState({ failed: false })} className="mt-3 min-h-[44px] rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[.98] disabled:opacity-50">Retry plot</button>
      </div>
    );
  }
}

export default function App() {
  const [backend, setBackend] = useState<BackendState>('checking');
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [rowTypes, setRowTypes] = useState<Record<string, string>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>(DEFAULT_VIEWPORT);
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
    const { rows: next, types } = toRows(r.equations ?? []);
    setRows(next);
    setRowTypes(types);
    setSelectedId(next[0]?.id ?? null);
    setViewport(DEFAULT_VIEWPORT);
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
    const { rows: next, types } = toRows(sampleEquations());
    setRows(next);
    setRowTypes(types);
    setSelectedId(next[0]?.id ?? null);
    setViewport(DEFAULT_VIEWPORT);
    setViewMode('2d');
    setTitle('Sample');
    setAttempted(true);
    setCause(null);
    setNotice(null);
    setCopied(false);
  }, []);

  const handleSelect = useCallback((id: string) => {
    setSelectedId(id);
    setViewMode('2d');
  }, []);

  const handleToggle = useCallback((id: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? toggleRow(r) : r)));
  }, []);

  const handleDuplicate = useCallback((id: string) => {
    const found = rows.find((r) => r.id === id);
    if (!found) return;
    const copy = duplicateRow(found);
    setRows((prev) => {
      const at = prev.findIndex((r) => r.id === id);
      if (at < 0) return prev;
      const next = [...prev];
      next.splice(at + 1, 0, copy);
      return next;
    });
    const t = rowTypes[id] ?? '';
    setRowTypes((prev) => ({ ...prev, [copy.id]: t }));
  }, [rows, rowTypes]);

  const handleEdit = useCallback((id: string, latex: string) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, latex } : r)));
  }, []);

  const handleParamSliders = useCallback((id: string, patch: Row['params']) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, params: patch } : r)));
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

  const selectedRow = rows.find((r) => r.id === selectedId) ?? rows[0] ?? null;
  const selectedType = selectedRow ? (rowTypes[selectedRow.id] ?? (selectedRow.latex.includes('\\begin') ? 'matrix' : '')) : '';
  const status = busy ? 'Extracting…' : (notice ?? (attempted ? `${rows.length} equations${title ? ` — ${title}` : ''}` : ''));
  const showZero = attempted && !busy && rows.length === 0;
  const selectedLatex = selectedRow ? selectedRow.latex : '';
  const regionRow = rows.find((r) => r.visible && isInequalityLatex(r.latex)) ?? null;
  const jumpTarget = regionRow && !busy
    ? findJumpTarget(regionRow.latex, params.xRange, params.yRange)
    : null;
  const jumpLabel = jumpTarget
    ? jumpTarget.x !== undefined && jumpTarget.y !== undefined
      ? `Recenter on (${jumpTarget.x}, ${jumpTarget.y})`
      : jumpTarget.x !== undefined
        ? `Recenter on x=${jumpTarget.x}`
        : `Recenter on y=${jumpTarget.y}`
    : null;
  const hasToggle = !!selectedRow
    && showDimensionToggle(selectedType, selectedLatex)
    && !/d[A-Za-z]?\s*\/\s*d\s*x|\\frac\s*\{\s*d/.test(selectedLatex);
  const regionVisible = !!regionRow && !busy && (!hasToggle || viewMode === '2d');

  const handleJump = useCallback(() => {
    setParams((p) => ({
      ...p,
      xRange: jumpTarget?.x !== undefined ? centerRangeOn(p.xRange, jumpTarget.x) : p.xRange,
      yRange: jumpTarget?.y !== undefined ? centerRangeOn(p.yRange, jumpTarget.y) : p.yRange,
    }));
  }, [jumpTarget]);

  const panRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = panRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const w = rect.width || 1;
      const h = rect.height || 1;
      const fx = (e.clientX - rect.left) / w;
      const fy = 1 - (e.clientY - rect.top) / h;
      setViewport((v) => {
        const cx = v.x[0] + fx * (v.x[1] - v.x[0]);
        const cy = v.y[0] + fy * (v.y[1] - v.y[0]);
        const factor = e.deltaY > 0 ? 1 / 1.1 : 1.1;
        return zoomViewport(v, cx, cy, factor);
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [rows.length]);

  return (
    <div className="min-h-screen bg-black font-sans text-white antialiased">
      <main className="mx-auto w-full max-w-7xl px-4 py-6 tabular-nums md:px-6 md:py-8">
        <h1 className="mb-1 font-sans text-xl font-semibold tracking-tight text-white">Equation to Plot</h1>
        <p className="mb-6 text-sm text-gray-300">Paste any paper math, play with it live.</p>

        {backend === 'down' && (
          <div className="mb-4 rounded-lg border border-red-900/60 bg-red-950/40 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-medium text-red-200">Can&apos;t reach server</p>
              <button
                type="button"
                onClick={() => void runCheck()}
                  className="min-h-[44px] rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-all duration-200 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[.98]"
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

        <p aria-live="polite" className="mt-3 min-h-[20px] text-sm tabular-nums text-gray-300">
          {backend === 'checking' && !busy ? 'Checking server…' : status}
        </p>

        <div className="mt-6 grid gap-6 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start">
          {showZero ? (
            <div className="rounded-lg border border-white/10 bg-surface p-4 text-center md:col-span-2">
              <p className="text-sm font-medium text-white">No equations found</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-gray-300">
                {cause?.includes('full text unavailable') ? 'No full text for this paper — its abstract had no plottable math.' : (cause ?? 'No extractable math detected in that input.')}
              </p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-center">
                <button
                  type="button"
                  onClick={handleSample}
                className="min-h-[44px] rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-all duration-200 hover:bg-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black active:scale-[.98]"
                >
                  Try sample
                </button>
                <button
                  type="button"
                  onClick={focusTabField}
                  className="min-h-[44px] rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[.98]"
                >
                  Edit input
                </button>
              </div>
            </div>
          ) : (
            <>
              {rows.length > 0 && (
                <p className="min-w-0 text-sm tabular-nums text-gray-300 md:col-span-2">
                  {cause ?? `${rows.length} equations${title ? ` — ${title}` : ''}`}
                </p>
              )}
              <ExpressionList
                rows={rows}
                selectedId={selectedRow?.id ?? null}
                onSelect={handleSelect}
                onToggle={handleToggle}
                onDuplicate={handleDuplicate}
                onEdit={handleEdit}
              />
              {selectedRow && !busy && (
                <PlotErrorBoundary key={selectedRow.id} paper={title} index={0} type={selectedType} latex={selectedLatex}>
                <section aria-label="Selected equation" className="min-w-0 rounded-lg border border-white/10 bg-surface p-4 tabular-nums">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-gray-300">
                      {selectedType || 'equation'}
                    </span>
                  </div>
                  <p
                    role="img"
                    aria-label={`Selected equation: ${selectedLatex}`}
                    className="break-words font-mono text-sm tabular-nums text-white"
                  >
                    {selectedLatex}
                  </p>
                  <div
                    ref={panRef}
                    onPointerDown={(e) => {
                      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
                      dragRef.current = { x: e.clientX, y: e.clientY };
                    }}
                    onPointerMove={(e) => {
                      const start = dragRef.current;
                      if (!start) return;
                      const el = panRef.current;
                      const rect = el?.getBoundingClientRect();
                      const w = rect?.width || 1;
                      const h = rect?.height || 1;
                      setViewport((v) => {
                        const dx = -((e.clientX - start.x) / w) * (v.x[1] - v.x[0]);
                        const dy = ((e.clientY - start.y) / h) * (v.y[1] - v.y[0]);
                        return panViewport(v, dx, dy);
                      });
                      dragRef.current = { x: e.clientX, y: e.clientY };
                    }}
                    onPointerUp={() => { dragRef.current = null; }}
                    onPointerCancel={() => { dragRef.current = null; }}
                    onDoubleClick={() => setViewport(DEFAULT_VIEWPORT)}
                  >
                    <MultiPlot2D rows={rows} viewport={viewport} height={320} />
                  </div>
                  <div className="mt-3">
                    {hasToggle ? (
                      <>
                        <div
                          role="radiogroup"
                          aria-label="Plot dimension"
                          className="mb-3 flex gap-2"
                        >
                          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300 transition-all duration-200 has-checked:border-white/30 has-checked:bg-white/10 has-checked:text-white focus-within:outline-none focus-within:ring-2 focus-within:ring-white">
                            <input
                              type="radio"
                              name="plot-dimension"
                              value="2d"
                              checked={viewMode === '2d'}
                              onChange={() => setViewMode('2d')}
                              className="h-4 w-4 accent-white"
                            />
                            2D
                          </label>
                          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-gray-300 transition-all duration-200 has-checked:border-white/30 has-checked:bg-white/10 has-checked:text-white focus-within:outline-none focus-within:ring-2 focus-within:ring-white">
                            <input
                              type="radio"
                              name="plot-dimension"
                              value="3d"
                              checked={viewMode === '3d'}
                              onChange={() => setViewMode('3d')}
                              className="h-4 w-4 accent-white"
                            />
                            3D
                          </label>
                        </div>
                        {viewMode === '3d' && (
                          <>
                            <Viewer3D
                              latex={selectedLatex}
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
                    ) : null}
                    <ParamSliders row={selectedRow} onChange={(patch) => handleParamSliders(selectedRow.id, patch)} />
                    {regionVisible && regionRow && (
                      <div className="mt-3">
                        <RegionPlot expr={regionRow.latex} xRange={params.xRange} yRange={params.yRange} />
                      </div>
                    )}
                    {regionVisible && jumpTarget && jumpLabel && (
                      <button
                        type="button"
                        onClick={handleJump}
                        className="mt-3 min-h-[44px] rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[.98]"
                      >
                        {jumpLabel}
                      </button>
                    )}
                    <p className="mt-2 text-xs text-gray-300">{hintFor(selectedType || 'equation')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleCopy(selectedLatex)}
                    className="mt-3 min-h-[44px] rounded-full border border-white/20 px-4 py-2 text-sm text-white transition-all duration-200 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[.98]"
                  >
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </section>
                </PlotErrorBoundary>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
