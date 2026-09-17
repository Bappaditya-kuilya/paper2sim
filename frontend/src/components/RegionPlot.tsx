import { useEffect, useRef } from 'react';
import {
  captionFor,
  freeSymbols,
  isKnownFunc,
  math,
  normalizeWithMeta,
  parseExpr,
  stripLatex,
  type Assumption,
} from '../lib/mathParser';
import { defaultFreeParams, expandGluedX, plotSide } from '../lib/plotMeta';

export interface RegionPlotProps {
  expr: string;
  xRange: [number, number];
  yRange: [number, number];
}

export interface JumpTarget {
  x?: number;
  y?: number;
}

const REGION_N = 100;
const TIME_BUDGET_MS = 150;
const BADGE =
  'inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white ring-1 ring-inset ring-white/20';
const CONST_RE = /(?<![A-Za-z0-9_.])-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?(?![A-Za-z0-9_])/g;
const noSpace = (s: string): string => s.replace(/\s+/g, '');

// Parse-core workaround (REPORTED): spokenToMath inserts a stray `*` before
// comparison ops (`y^(2)*<=4`, invalid). Never touch mathParser.ts — repair the
// artifact here: `*` directly before a comparison can never be valid mathjs.
function repairComparisonOps(src: string): string {
  return src.replace(/\*\s*(<=|>=|==|!=|<|>)/g, '$1');
}

// Region normalization: inequality pre-map + normalizeWithMeta + repair.
function normalizeRegionExpr(raw: string): { expr: string; assumptions: Assumption[] } {
  const r = normalizeWithMeta(normalizeInequalityLatex(raw));
  return { expr: repairComparisonOps(r.expr), assumptions: r.assumptions };
}

function stripFuncCalls(s: string): string {
  return s.replace(/\\?[A-Za-z][A-Za-z0-9]*\s*\(/g, (m) => {
    const name = m.replace(/\\|\s*\($/g, '');
    return isKnownFunc(name) || isKnownFunc(name.toLowerCase()) ? '(' : m;
  });
}

// ponytail: parse-core freeSymbols first (structural), identifier fallback for
// unparseable fragments; func filtering via isKnownFunc — no hand lists.
export function hasIneqVar(expr: string, v: 'x' | 'y'): boolean {
  try {
    return freeSymbols(parseExpr(expr)).includes(v);
  } catch {
    const t = stripFuncCalls(expr);
    const re = new RegExp(`(^|[^A-Za-z0-9_)])${v}(?![A-Za-z0-9_(])`);
    if (re.test(t)) return true;
    return new RegExp(`[A-Za-z0-9)]${v}(?![A-Za-z0-9_(])`).test(t);
  }
}

export function scanConsts(expr: string): number[] {
  const m = expr.match(CONST_RE);
  if (!m) return [];
  return m.map(Number).filter((n) => Number.isFinite(n));
}

// Guard helper: throws card-tagged errors (rendered as honest cards by callers).
export function assertRegionPlottable(expr: string): void {
  if (!hasIneqVar(expr, 'x') && !hasIneqVar(expr, 'y')) {
    throw new Error('card: no x/y variable in region');
  }
  for (const c of scanConsts(expr)) {
    if (Math.abs(c) > 1e6) throw new Error(`card: constant too large to plot (|const|>1e6): ${c}`);
  }
}

export function isInequalityLatex(latex: string): boolean {
  if (/<=|>=|≤|≥|\\leq\b|\\le\b|\\geq\b|\\ge\b/.test(latex)) return true;
  const s = latex.replace(/=>|->|<-|<=>/g, '');
  return /<|>/.test(s);
}

export function normalizeInequalityLatex(latex: string): string {
  return latex
    .replace(/\\leq\b|\\le\b/g, '<=')
    .replace(/\\geq\b|\\ge\b/g, '>=')
    .replace(/≤/g, '<=')
    .replace(/≥/g, '>=');
}

// Heavy-rewrite echo: normalized expr when it differs from the plotted side.
// Silent (null) if identical or on CARD. Single source for RegionPlot + inspect.
export function normalizedEcho(raw: string): string | null {
  try {
    const mapped = normalizeInequalityLatex(raw);
    const norm = normalizeRegionExpr(raw).expr;
    const base = plotSide(mapped) ?? mapped;
    return noSpace(norm) === noSpace(stripLatex(base)) ? null : norm;
  } catch {
    return null;
  }
}

// Structural jump target: (x∓C)/(y∓C) shift patterns only. Bare RHS consts are
// skipped (axis murky — caption suffices). No artwork constants: C from expr.
export function findJumpTarget(
  expr: string,
  xRange: [number, number],
  yRange: [number, number],
): JumpTarget | null {
  const out: JumpTarget = {};
  const xm = expr.match(/\(\s*x\s*([+-])\s*(\d+(?:\.\d+)?)\s*\)/);
  if (xm?.[1] && xm[2]) {
    const c = Number(xm[2]);
    if (Number.isFinite(c)) {
      const tx = xm[1] === '-' ? c : -c;
      if (tx < xRange[0] || tx > xRange[1]) out.x = tx;
    }
  }
  const ym = expr.match(/\(\s*y\s*([+-])\s*(\d+(?:\.\d+)?)\s*\)/);
  if (ym?.[1] && ym[2]) {
    const c = Number(ym[2]);
    if (Number.isFinite(c)) {
      const ty = ym[1] === '-' ? c : -c;
      if (ty < yRange[0] || ty > yRange[1]) out.y = ty;
    }
  }
  return out.x !== undefined || out.y !== undefined ? out : null;
}

export function centerRangeOn(range: [number, number], c: number): [number, number] {
  const span = range[1] - range[0];
  return [c - span / 2, c + span / 2];
}

function card(expr: string, label: string, reason: string) {
  return (
    <div role="img" aria-label={label} className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <span className={BADGE}>region</span>
      <p className="mt-2 break-words font-mono text-sm text-zinc-100">{expr}</p>
      <p className="mt-2 text-xs text-zinc-400">{reason}</p>
    </div>
  );
}

type CompiledRegion = { evaluate(scope: Record<string, number>): unknown };

// ponytail: grid eval + budget clock live outside the component so the render
// body stays pure (lint); stride-2 display + note kick in past ~150ms.
function evaluateRegionGrid(
  code: CompiledRegion,
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  N: number,
): { grid: Uint8Array; trueCount: number; ok: boolean; elapsed: number } {
  const grid = new Uint8Array(N * N);
  let trueCount = 0;
  let ok = true;
  const t0 = performance.now();
  try {
    for (let j = 0; j < N; j++) {
      const y = y1 - ((j + 0.5) / N) * (y1 - y0);
      for (let i = 0; i < N; i++) {
        const x = x0 + ((i + 0.5) / N) * (x1 - x0);
        let b = false;
        try {
          b = Boolean(code.evaluate({ x, y }));
        } catch {
          b = false;
        }
        if (b) {
          grid[j * N + i] = 1;
          trueCount++;
        }
      }
    }
  } catch {
    ok = false;
  }
  return { grid, trueCount, ok, elapsed: performance.now() - t0 };
}

export function RegionPlot({ expr, xRange, yRange }: RegionPlotProps) {
  const label = `region plot of ${expr}`;
  const [x0, x1] = xRange;
  const [y0, y1] = yRange;

  let norm = '';
  let assumptions: Assumption[] = [];
  let normError: string | null = null;
  try {
    const r = normalizeRegionExpr(expr);
    norm = r.expr;
    assumptions = r.assumptions;
  } catch (e) {
    normError = e instanceof Error && e.message ? e.message : 'not plottable';
  }

  let guardError: string | null = normError;
  let compiledSrc = '';
  if (!guardError) {
    compiledSrc = defaultFreeParams(expandGluedX(norm.replace(/≤/g, '<=').replace(/≥/g, '>=')));
    try {
      assertRegionPlottable(compiledSrc);
    } catch (e) {
      guardError = e instanceof Error && e.message ? e.message : 'not plottable';
    }
  }

  let code: { evaluate(scope: Record<string, number>): unknown } | null = null;
  let compileError: string | null = null;
  if (!guardError) {
    try {
      code = math.compile(compiledSrc);
    } catch {
      compileError = 'no finite points on visible domain';
    }
  }
  const blocked = guardError ?? compileError;
  void blocked;

  const N = REGION_N;
  const inputOk = !blocked && code !== null;
  const evalRes = inputOk && code
    ? evaluateRegionGrid(code, x0, x1, y0, y1, N)
    : { grid: new Uint8Array(N * N), trueCount: 0, ok: false, elapsed: 0 };
  const { grid, trueCount } = evalRes;
  const evalOk = evalRes.ok;
  const downsampled = evalRes.elapsed > TIME_BUDGET_MS;

  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || !evalOk) return;
    try {
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.clearRect(0, 0, cv.width, cv.height);
      ctx.fillStyle = '#FFFFFF';
      const stride = downsampled ? 2 : 1;
      for (let j = 0; j < N; j += stride) {
        for (let i = 0; i < N; i += stride) {
          if (grid[j * N + i]) ctx.fillRect(i, j, 1, 1);
        }
      }
    } catch {
      // jsdom / no-canvas: element still asserts; honest note below covers it.
    }
  });

  if (blocked) return card(expr, label, blocked);
  if (!evalOk || !code) return card(expr, label, 'no finite points on visible domain');

  const fill = trueCount / (N * N);
  if (fill < 0.02) return card(expr, label, `no true cells on x∈[${x0},${x1}] y∈[${y0},${y1}]`);
  if (fill > 0.95) {
    return card(expr, label, 'true everywhere on visible domain — widen range to see boundary');
  }

  const echo = normalizedEcho(expr);
  const pct = Math.round(fill * 100);
  return (
    <div role="img" aria-label={label} className="w-full">
      <span className={BADGE}>region</span>
      <p className="mt-2 break-words font-mono text-sm text-zinc-100">{expr}</p>
      {echo && <p className="mt-1 font-mono text-xs text-zinc-500">normalized: {echo}</p>}
      <canvas ref={ref} width={N} height={N} aria-hidden="true" style={{ width: '100%', imageRendering: 'pixelated' }} />
      <p className="mt-1 text-xs text-zinc-400">shaded = true over visible domain</p>
      <p className="mt-1 text-xs text-zinc-400">{pct}% true on x∈[{x0},{x1}] y∈[{y0},{y1}]</p>
      {assumptions.map(captionFor).map((c) => (
        <p key={c} className="mt-1 text-xs text-zinc-400">{c}</p>
      ))}
      {downsampled && <p className="mt-1 text-xs text-zinc-400">downsampled for speed (stride 2)</p>}
    </div>
  );
}
