import { useState } from 'react';
import { captionFor, freeSymbols, isKnownFunc, math, normalizeInput, normalizeWithMeta, parseExpr, stripLatex } from '../lib/mathParser';
import type { Equation } from '../lib/extractApi';
import { isFunctionLike, expandGluedX, plotSide } from '../lib/plotMeta';
import { RegionPlot, hasIneqVar, isInequalityLatex, normalizeInequalityLatex, normalizedEcho } from './RegionPlot';

interface Plot2DProps {
  equation: Equation;
  height?: number;
  xRange?: [number, number];
  yRange?: [number, number];
}

const N_POINTS = 200;
const X_MIN = -10;
const X_MAX = 10;
const VIEW_W = 600;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 32;
const BADGE =
  'inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300';

// ponytail: free params (k, a, b, ...) default to 1; full param UI lands with the 3D panel.
export const DEFAULT_SCOPE: Record<string, number> = { k: 1, a: 1, b: 1, c: 1, d: 1, m: 1, n: 1, p: 1, q: 1, t: 1, y: 1 };

// Sampling core shared with MultiPlot2D: compile once, eval n points over
// xRange with {...DEFAULT_SCOPE, ...scope, x}. Unchanged math from renderFunction.
export function sampleRow(
  latex: string,
  xRange: [number, number],
  scope: Record<string, number>,
  n = N_POINTS,
): Array<[number, number]> {
  const raw = expandGluedX(normalizeInput(latex));
  // Fallback subscript drop (Agent A canonical lands in mathParser): X_(...)→X.
  const expr = raw.replace(/_\([^)]*\)/g, '').replace(/_[A-Za-z0-9]/g, '');
  if (!expr) throw new Error('empty expression');
  const code = math.compile(expr);
  const count = n > 1 ? Math.floor(n) : N_POINTS;
  const [lo, hi] = xRange;
  const pts: Array<[number, number]> = [];
  for (let i = 0; i < count; i++) {
    const x = lo + ((hi - lo) * i) / (count - 1);
    let y = NaN;
    try {
      const v: unknown = code.evaluate({ ...DEFAULT_SCOPE, ...scope, x });
      const num = typeof v === 'number' ? v : Number(v);
      if (Number.isFinite(num)) y = num;
    } catch {
      y = NaN;
    }
    pts.push([x, y]);
  }
  return pts;
}

// Captions come from mathParser.normalizeWithMeta/captionFor (agent A canonical).

function isDerivativeForm(latex: string): boolean {
  return /d[A-Za-z]?\s*\/\s*d\s*x|\\frac\s*\{\s*d/.test(latex);
}

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

function fmt(n: number): string {
  return String(Math.round(n * 100) / 100);
}

function isDistribution(type: string): boolean {
  const t = type.toLowerCase();
  return (
    t.includes('distrib') ||
    t.includes('prob') ||
    t.includes('stat') ||
    t.includes('gauss') ||
    t.includes('normal')
  );
}

function parseMatrixGrid(latex: string): string[][] | null {
  const m = latex.match(/\\begin\{(bmatrix|pmatrix|matrix|vmatrix|Bmatrix)\}([\s\S]*?)\\end\{\1\}/);
  if (!m) return null;
  const body = m[2];
  if (!body) return null;
  const rows = body
    .split(/\\\\/g)
    .map((r) => r.trim())
    .filter((r) => r.length > 0);
  if (rows.length === 0) return null;
  return rows.map((r) => r.split('&').map((c) => c.trim()));
}

function renderFunction(latex: string, label: string, height: number, captions: string[]) {
  try {
    const h = height > 0 ? height : 320;
    const pts = sampleRow(latex, [X_MIN, X_MAX], DEFAULT_SCOPE, N_POINTS);
    const finite = pts.map(([, y]) => y).filter((v) => Number.isFinite(v));
    if (finite.length === 0) throw new Error('no finite points');
    let ymin = Math.min(...finite);
    let ymax = Math.max(...finite);
    if (ymin === ymax) {
      ymin -= 1;
      ymax += 1;
    } else {
      const pad = (ymax - ymin) * 0.1;
      ymin -= pad;
      ymax += pad;
    }
    const innerW = VIEW_W - PAD_L - PAD_R;
    const innerH = h - PAD_T - PAD_B;
    const xToPx = (x: number): number => PAD_L + ((x - X_MIN) / (X_MAX - X_MIN)) * innerW;
    const yToPx = (y: number): number => PAD_T + (1 - (y - ymin) / (ymax - ymin)) * innerH;
    let d = '';
    let prevFinite = false;
    let prevY = 0;
    const span = ymax - ymin || 1;
    for (const [xv, yv] of pts) {
      if (!Number.isFinite(yv)) {
        prevFinite = false;
        continue;
      }
      // ponytail: break vertical spike across poles (jump >50% of range = new subpath)
      const jump = prevFinite && Math.abs(yv - prevY) > span * 0.5;
      d += `${prevFinite && !jump ? 'L' : 'M'}${xToPx(xv).toFixed(2)},${yToPx(yv).toFixed(2)} `;
      prevFinite = true;
      prevY = yv;
    }
    if (!d) throw new Error('empty path');
    const xTicks = [0, 1, 2, 3, 4].map((i) => X_MIN + ((X_MAX - X_MIN) * i) / 4);
    const yTicks = [0, 1, 2, 3, 4].map((i) => ymin + ((ymax - ymin) * i) / 4);
    const xZero = xToPx(Math.min(X_MAX, Math.max(X_MIN, 0)));
    const yZero = yToPx(Math.min(ymax, Math.max(ymin, 0)));
    return (
      <div role="img" aria-label={label} className="w-full">
        <svg viewBox={`0 0 ${VIEW_W} ${h}`} style={{ width: '100%', height: h }} aria-hidden="true">
          {xTicks.map((t) => (
            <line key={`gx${t}`} x1={xToPx(t)} y1={PAD_T} x2={xToPx(t)} y2={h - PAD_B} stroke="#27272a" strokeWidth={1} />
          ))}
          {yTicks.map((t) => (
            <line key={`gy${t}`} x1={PAD_L} y1={yToPx(t)} x2={VIEW_W - PAD_R} y2={yToPx(t)} stroke="#27272a" strokeWidth={1} />
          ))}
          <line x1={PAD_L} y1={yZero} x2={VIEW_W - PAD_R} y2={yZero} stroke="#a1a1aa" strokeWidth={1} />
          <line x1={xZero} y1={PAD_T} x2={xZero} y2={h - PAD_B} stroke="#a1a1aa" strokeWidth={1} />
          <path d={d.trim()} fill="none" stroke="#34d399" strokeWidth={2} />
          {xTicks.map((t) => (
            <text key={`tx${t}`} x={xToPx(t)} y={h - PAD_B + 16} textAnchor="middle" fontSize={10} fill="#a1a1aa">
              {fmt(t)}
            </text>
          ))}
          {yTicks.map((t) => (
            <text key={`ty${t}`} x={PAD_L - 6} y={yToPx(t) + 3} textAnchor="end" fontSize={10} fill="#a1a1aa">
              {fmt(t)}
            </text>
          ))}
          <text x={VIEW_W - PAD_R} y={h - 6} textAnchor="end" fontSize={11} fill="#a1a1aa">x</text>
          <text x={12} y={PAD_T + 4} textAnchor="start" fontSize={11} fill="#a1a1aa">y</text>
        </svg>
        {captions.map((c) => (
          <p key={c} className="mt-1 text-xs text-zinc-400">{c}</p>
        ))}
      </div>
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : '';
    const reason = msg.includes('empty expression')
      ? 'empty expression'
      : 'no finite points on x∈[-10,10]';
    return (
      <div role="img" aria-label={label} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-4">
        <span className={BADGE}>not plottable</span>
        <p className="mt-2 break-words font-mono text-sm text-zinc-100">{latex}</p>
        <p className="mt-2 text-xs text-zinc-400">{reason}</p>
      </div>
    );
  }
}

function renderMatrix(latex: string, label: string) {
  const fail = (msg: string) => (
    <div role="img" aria-label={label} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <p className="text-sm text-zinc-300">{msg}</p>
      <p className="mt-2 break-words font-mono text-sm text-zinc-100">{latex}</p>
    </div>
  );
  const grid = parseMatrixGrid(latex);
  if (!grid || grid.length === 0) return fail('Could not parse matrix');
  const totalRows = grid.length;
  const totalCols = grid[0].length;
  if (grid.some((row) => row.length !== totalCols)) return fail('Non-rectangular matrix');
  if (totalRows * totalCols > 10000 || latex.length > 100 * 1024) return fail('Matrix too large to render');
  let rows = grid;
  let note: string | null = null;
  if (totalRows > 10 || totalCols > 10) {
    // ponytail: stride downsample keeps shape; virtualized grid if huge matrices matter.
    const pick = (n: number): number[] =>
      Array.from({ length: 10 }, (_, i) => Math.min(n - 1, Math.round((i * (n - 1)) / 9)));
    const ri = totalRows > 10 ? pick(totalRows) : grid.map((_, i) => i);
    const ci = totalCols > 10 ? pick(totalCols) : grid[0].map((_, i) => i);
    rows = ri.map((r) => ci.map((c) => grid[r][c]));
    note = `Showing 10x10 of ${totalRows}x${totalCols}`;
  }
  const numeric = rows.map((row) => row.map((cell) => Number(stripLatex(cell))));
  const flat = numeric.flat().filter((v) => Number.isFinite(v));
  const lo = flat.length > 0 ? Math.min(...flat) : 0;
  const hi = flat.length > 0 ? Math.max(...flat) : 1;
  const span = hi - lo || 1;
  const showValues = rows.length <= 6 && rows[0].length <= 6;
  const bg = (v: number): string =>
    Number.isFinite(v) ? `rgba(52, 211, 153, ${(0.12 + (0.75 * (v - lo)) / span).toFixed(2)})` : 'transparent';
  return (
    <div role="img" aria-label={label} className="w-full">
      {note && <p className="mb-2 text-xs text-zinc-400">{note}</p>}
      <div className="overflow-x-auto">
        <table className="border-collapse">
          <tbody>
            {rows.map((row, i) => (
              <tr key={`r${i}`}>
                {row.map((cell, j) => (
                  <td
                    key={`c${j}`}
                    title={showValues ? undefined : stripLatex(cell)}
                    style={{ backgroundColor: bg(numeric[i][j]) }}
                    className="min-w-10 border border-zinc-800 px-2 py-1 text-center font-mono text-sm text-zinc-100"
                  >
                    {showValues ? stripLatex(cell) : ''}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function renderDistribution(latex: string, type: string, label: string) {
  const hasNumbers = /\d/.test(latex);
  return (
    <div role="img" aria-label={label} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <span className={BADGE}>{type}</span>
      <p className="mt-2 break-words font-mono text-sm text-zinc-100">{latex}</p>
      {!hasNumbers && <p className="mt-2 text-xs text-zinc-400">Defaults μ=0 σ=1</p>}
    </div>
  );
}

function renderInfo(latex: string, type: string, label: string) {
  return (
    <div role="img" aria-label={label} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <span className={BADGE}>{type}</span>
      <p className="mt-2 break-words font-mono text-sm text-zinc-100">{latex}</p>
      <p className="mt-2 text-xs text-zinc-400">No 2D plot for this type</p>
    </div>
  );
}

// Session-only memory for unsure A/B picks (cleared on reload, never persisted).
const inspectChoices = new Map<string, string>();

function splitEquality(latex: string): { lhs: string; rhs: string } | null {
  const eq = latex.search(/(?<![=!<>])=(?![=<>])/);
  if (eq < 0) return null;
  return { lhs: latex.slice(0, eq), rhs: latex.slice(eq + 1) };
}

function inspectParts(latex: string): { vars: string[]; consts: string[]; shape: string } {
  let src = latex;
  try {
    src = normalizeWithMeta(normalizeInequalityLatex(latex)).expr;
  } catch {
    src = latex;
  }
  let vars: string[];
  try {
    vars = freeSymbols(parseExpr(src));
  } catch {
    vars = [...new Set(src.match(/\b[A-Za-z][A-Za-z0-9]*\b/g) ?? [])].filter(
      (w) => !isKnownFunc(w) && !isKnownFunc(w.toLowerCase()) && w !== 'e' && w !== 'pi' && w !== 'tau',
    );
  }
  const consts = [...new Set(src.match(/-?\d+(\.\d+)?/g) ?? [])];
  return { vars, consts, shape: latex.includes('=') ? 'equality' : 'expression' };
}

function InspectCard({ latex, label, height }: { latex: string; label: string; height: number }) {
  const [override, setOverride] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [choice, setChoice] = useState<string | null>(() => inspectChoices.get(latex) ?? null);
  const sides = splitEquality(latex);
  const unsure = !!sides && hasIneqVar(sides.lhs, 'x') && hasIneqVar(sides.rhs, 'x');
  const activeChoice = choice ?? inspectChoices.get(latex) ?? null;
  const rawSide = activeChoice ?? plotSide(latex) ?? sides?.rhs.trim() ?? sides?.lhs.trim() ?? latex;
  const guess = rawSide.startsWith('y=') ? rawSide : `y=${rawSide}`;
  const badge =
    sides && /^[A-Za-z][A-Za-z0-9]*$/.test(sides.lhs.trim()) ? 'DEFINITION' : 'IDENTITY';
  const parts = inspectParts(latex);
  const echo = normalizedEcho(latex);
  let captions: string[] = [];
  try {
    captions = normalizeWithMeta(latex).assumptions.map(captionFor);
  } catch {
    captions = [];
  }

  if (override) {
    let oc: string[] = [];
    try {
      oc = normalizeWithMeta(override).assumptions.map(captionFor);
    } catch {
      oc = [];
    }
    return renderFunction(override, label, height, oc);
  }

  const pick = (side: string) => {
    inspectChoices.set(latex, side);
    setChoice(side);
  };

  const editDraft = () => {
    setDraft(guess);
    try {
      const el = document.getElementById('inputtabs-field') as
        | HTMLTextAreaElement
        | HTMLInputElement
        | null;
      if (el) el.value = guess;
    } catch {
      // local draft still shows; main input sync is best-effort only.
    }
  };

  return (
    <div role="img" aria-label={label} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <span className={BADGE}>{badge}</span>
      <p className="mt-2 break-words font-mono text-sm text-zinc-100">{latex}</p>
      {echo && <p className="mt-1 font-mono text-xs text-zinc-500">normalized: {echo}</p>}
      {unsure && sides && !activeChoice ? (
        <div className="mt-3 rounded-md border border-zinc-800 p-3">
          <p className="text-xs text-zinc-400">Two parses — pick one:</p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => pick(sides.lhs.trim())}
              className="min-h-[44px] rounded-md border border-zinc-700 px-4 py-2 font-mono text-sm text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              Use A: {sides.lhs.trim()}
            </button>
            <button
              type="button"
              onClick={() => pick(sides.rhs.trim())}
              className="min-h-[44px] rounded-md border border-zinc-700 px-4 py-2 font-mono text-sm text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
            >
              Use B: {sides.rhs.trim()}
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={() => setOverride(guess)}
            className="min-h-[44px] rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            Plot one side
          </button>
          <button
            type="button"
            onClick={editDraft}
            className="min-h-[44px] rounded-md border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
          >
            Edit into y=…
          </button>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <span className={BADGE}>vars: {parts.vars.join(', ') || '—'}</span>
        <span className={BADGE}>consts: {parts.consts.join(', ') || '—'}</span>
        <span className={BADGE}>shape: {parts.shape}</span>
      </div>
      <p className="mt-2 text-xs text-zinc-400">No 2D plot for this type</p>
      {captions.map((c) => (
        <p key={c} className="mt-1 text-xs text-zinc-400">{c}</p>
      ))}
      {draft && (
        <div className="mt-3">
          <label htmlFor="inspect-draft" className="mb-1 block text-xs text-zinc-400">
            Draft (not evaluated)
          </label>
          <input
            id="inspect-draft"
            aria-label="Draft input"
            value={draft}
            readOnly
            className="min-h-[44px] w-full rounded-md border border-zinc-700 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none"
          />
        </div>
      )}
    </div>
  );
}

export function Plot2D({
  equation,
  height = 320,
  xRange = [-10, 10] as [number, number],
  yRange = [-10, 10] as [number, number],
}: Plot2DProps) {
  const latex = eqText(equation);
  const type = eqType(equation);
  const label = `${latex} (${type})`;
  if (type.toLowerCase().includes('matrix') || latex.includes('\\begin')) return renderMatrix(latex, label);
  if (isDerivativeForm(latex)) return renderInfo(latex, type, label);
  if (isInequalityLatex(latex)) return <RegionPlot expr={latex} xRange={xRange} yRange={yRange} />;
  // ponytail: A's normalizeWithMeta throws on CARD (sum/integral); captions
  // aren't shown on the info card, so empty is the honest fallback.
  let captions: string[] = [];
  try {
    captions = normalizeWithMeta(latex).assumptions.map(captionFor);
  } catch {
    captions = [];
  }
  if (isFunctionLike(type)) return renderFunction(latex, label, height, captions);
  if (isDistribution(type)) return renderDistribution(latex, type, label);
  const side = plotSide(latex);
  if (side !== null) return renderFunction(side, label, height, captions);
  return <InspectCard latex={latex} label={label} height={height} />;
}
