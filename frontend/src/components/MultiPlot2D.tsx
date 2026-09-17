import { useId, useState } from 'react';
import { DEFAULT_SCOPE, sampleRow } from './Plot2D';
import { isInequalityLatex } from './RegionPlot';
import { DASH_CYCLE, type Row } from '../lib/expressionRows';
import type { Viewport } from '../lib/viewport';

interface MultiPlot2DProps {
  rows: Row[];
  viewport: Viewport;
  height?: number;
}

const VIEW_W = 600;
const PAD_L = 44;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 32;

function fmt(n: number): string {
  return String(Math.round(n * 100) / 100);
}

export function MultiPlot2D({ rows, viewport, height = 320 }: MultiPlot2DProps) {
  const [hover, setHover] = useState<string | null>(null);
  const clipId = useId();
  const h = height > 0 ? height : 320;
  const [x0, x1] = viewport.x;
  const [y0, y1] = viewport.y;
  const xSpan = x1 - x0 || 1;
  const ySpan = y1 - y0 || 1;
  const innerW = VIEW_W - PAD_L - PAD_R;
  const innerH = h - PAD_T - PAD_B;
  const xToPx = (x: number): number => PAD_L + ((x - x0) / xSpan) * innerW;
  const yToPx = (y: number): number => PAD_T + (1 - (y - y0) / ySpan) * innerH;

  const paths: Array<{ id: string; color: string; d: string }> = [];
  for (const row of rows) {
    if (!row.visible) continue;
    // Regions stay App's job; matrices never compile — skip both silently.
    if (row.latex.includes('\\begin') || isInequalityLatex(row.latex)) continue;
    const scope: Record<string, number> = { ...DEFAULT_SCOPE };
    for (const [k, p] of Object.entries(row.params)) scope[k] = p.value;
    let pts: Array<[number, number]>;
    try {
      pts = sampleRow(row.latex, viewport.x, scope, 200);
    } catch {
      continue;
    }
    if (!pts.some(([, y]) => Number.isFinite(y))) continue;
    let d = '';
    let prevFinite = false;
    let prevY = 0;
    for (const [xv, yv] of pts) {
      if (!Number.isFinite(yv)) {
        prevFinite = false;
        continue;
      }
      // ponytail: same pole rule as Plot2D — jump >50% of y-span = new subpath.
      const jump = prevFinite && Math.abs(yv - prevY) > ySpan * 0.5;
      d += `${prevFinite && !jump ? 'L' : 'M'}${xToPx(xv).toFixed(2)},${yToPx(yv).toFixed(2)} `;
      prevFinite = true;
      prevY = yv;
    }
    if (d.trim()) paths.push({ id: row.id, color: row.color, d: d.trim() });
  }

  if (paths.length === 0) {
    return (
      <div
        role="img"
        aria-label="No visible plots"
        className="w-full rounded-lg border border-white/10 bg-black p-4"
      >
        <p className="text-sm tabular-nums text-[#D1D5DB]">No visible plots</p>
      </div>
    );
  }

  const xTicks = [0, 1, 2, 3, 4].map((i) => x0 + (xSpan * i) / 4);
  const yTicks = [0, 1, 2, 3, 4].map((i) => y0 + (ySpan * i) / 4);
  const xZero = xToPx(Math.min(x1, Math.max(x0, 0)));
  const yZero = yToPx(Math.min(y1, Math.max(y0, 0)));
  return (
    <div role="img" aria-label={`${paths.length} plot${paths.length === 1 ? '' : 's'}`} className="w-full">
      <svg viewBox={`0 0 ${VIEW_W} ${h}`} style={{ width: '100%', height: h }} aria-hidden="true">
        <defs>
          <clipPath id={clipId}>
            <rect x={PAD_L} y={PAD_T} width={innerW} height={innerH} />
          </clipPath>
        </defs>
        {xTicks.map((t) => (
          <line key={`gx${t}`} x1={xToPx(t)} y1={PAD_T} x2={xToPx(t)} y2={h - PAD_B} stroke="#27272a" strokeWidth={1} />
        ))}
        {yTicks.map((t) => (
          <line key={`gy${t}`} x1={PAD_L} y1={yToPx(t)} x2={VIEW_W - PAD_R} y2={yToPx(t)} stroke="#27272a" strokeWidth={1} />
        ))}
        <line x1={PAD_L} y1={yZero} x2={VIEW_W - PAD_R} y2={yZero} stroke="#a1a1aa" strokeWidth={1} />
        <line x1={xZero} y1={PAD_T} x2={xZero} y2={h - PAD_B} stroke="#a1a1aa" strokeWidth={1} />
        <g clipPath={`url(#${clipId})`}>
          {paths.map((p, i) => (
            <path
              key={p.id}
              d={p.d}
              fill="none"
              stroke={p.color}
              strokeWidth={2.5}
              strokeDasharray={DASH_CYCLE[i % DASH_CYCLE.length] || undefined}
              opacity={hover === null || hover === p.id ? 1 : 0.3}
              onMouseEnter={() => setHover(p.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(p.id)}
              onBlur={() => setHover(null)}
              style={{ pointerEvents: 'stroke', cursor: 'pointer' }}
              className="transition-opacity"
            />
          ))}
        </g>
        {xTicks.map((t) => (
          <text key={`tx${t}`} x={xToPx(t)} y={h - PAD_B + 16} textAnchor="middle" fontSize={10} fill="#a1a1aa" className="tabular-nums">
            {fmt(t)}
          </text>
        ))}
        {yTicks.map((t) => (
          <text key={`ty${t}`} x={PAD_L - 6} y={yToPx(t) + 3} textAnchor="end" fontSize={10} fill="#a1a1aa" className="tabular-nums">
            {fmt(t)}
          </text>
        ))}
        <text x={VIEW_W - PAD_R} y={h - 6} textAnchor="end" fontSize={11} fill="#a1a1aa">x</text>
        <text x={12} y={PAD_T + 4} textAnchor="start" fontSize={11} fill="#a1a1aa">y</text>
      </svg>
    </div>
  );
}
