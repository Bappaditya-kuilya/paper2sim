import { useState } from 'react';
import type { ViewerParams, ParamPatch } from '../lib/viewerParams';

export interface ParamPanelProps extends ViewerParams {
  onChange(patch: ParamPatch): void;
}

const MIN_EDGE = -10;
const MAX_EDGE = 10;
const MIN_SPAN = 0.5;
const RES_MIN = 16;
const RES_MAX = 96;

const INPUT =
  'min-h-[44px] w-full rounded-full border border-white/10 bg-[#111111] px-3 py-2 font-mono text-sm tabular-nums text-white outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white';
const INPUT_ERROR = 'border-red-500';
const LABEL = 'mb-1 block text-xs text-[#D1D5DB]';

// Contract: ParamPanel only emits valid patches via onChange — the parent keeps
// the last-valid params and never unmounts the canvas. Invalid input shows an
// inline error/note here and leaves the rendered surface untouched.
export function ParamPanel({
  xRange,
  yRange,
  resolution,
  showGrid,
  showAxes,
  wireframe,
  onChange,
}: ParamPanelProps) {
  const [xMin, setXMin] = useState(String(xRange[0]));
  const [xMax, setXMax] = useState(String(xRange[1]));
  const [yMin, setYMin] = useState(String(yRange[0]));
  const [yMax, setYMax] = useState(String(yRange[1]));
  const [errorAxis, setErrorAxis] = useState<'x' | 'y' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Echo committed (parent) values back into the fields via React's
  // prev-props-in-render pattern: in-progress typing never changes props,
  // so it is never overwritten, and no effect (no cascading render) is needed.
  const [synced, setSynced] = useState({ xRange, yRange });
  if (synced.xRange !== xRange || synced.yRange !== yRange) {
    setSynced({ xRange, yRange });
    setXMin(String(xRange[0]));
    setXMax(String(xRange[1]));
    setYMin(String(yRange[0]));
    setYMax(String(yRange[1]));
  }

  function fail(axis: 'x' | 'y', msg: string) {
    setErrorAxis(axis);
    setError(msg);
  }

  function commitRange(axis: 'x' | 'y', rawMin: string, rawMax: string) {
    if (rawMin.trim() === '' || rawMax.trim() === '') return; // still typing — stay pending
    const lo = Number(rawMin);
    const hi = Number(rawMax);
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
      fail(axis, 'Enter numbers for both ends — keeping last valid range.');
      return;
    }
    if (lo >= hi) {
      fail(axis, 'Min must be less than max — keeping last valid range.');
      return;
    }
    const cLo = Math.min(MAX_EDGE, Math.max(MIN_EDGE, lo));
    const cHi = Math.min(MAX_EDGE, Math.max(MIN_EDGE, hi));
    if (cHi - cLo < MIN_SPAN) {
      fail(axis, 'Range span must be at least 0.5 — keeping last valid range.');
      return;
    }
    setErrorAxis(null);
    setError(null);
    setNote(cLo !== lo || cHi !== hi ? `Clamped to [${MIN_EDGE}, ${MAX_EDGE}].` : null);
    onChange(axis === 'x' ? { xRange: [cLo, cHi] } : { yRange: [cLo, cHi] });
  }

  function commitResolution(raw: string) {
    if (raw.trim() === '') return;
    const n = Number(raw);
    if (!Number.isFinite(n)) return; // silent, like all resolution clamps (§6: no toast)
    // ponytail: 96 caps mobile GPU cost; raise when instancing lands.
    onChange({ resolution: Math.min(RES_MAX, Math.max(RES_MIN, Math.round(n))) });
  }

  const rangeClass = (axis: 'x' | 'y') => `${INPUT} ${errorAxis === axis ? INPUT_ERROR : ''}`;

  return (
    <div className="mt-3 rounded-lg border border-white/10 bg-black p-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="param-xmin" className={LABEL}>
            X min
          </label>
          <input
            id="param-xmin"
            type="number"
            step={0.5}
            min={MIN_EDGE}
            max={MAX_EDGE}
            value={xMin}
            onChange={(e) => {
              setXMin(e.target.value);
              commitRange('x', e.target.value, xMax);
            }}
            aria-invalid={errorAxis === 'x'}
            className={rangeClass('x')}
          />
        </div>
        <div>
          <label htmlFor="param-xmax" className={LABEL}>
            X max
          </label>
          <input
            id="param-xmax"
            type="number"
            step={0.5}
            min={MIN_EDGE}
            max={MAX_EDGE}
            value={xMax}
            onChange={(e) => {
              setXMax(e.target.value);
              commitRange('x', xMin, e.target.value);
            }}
            aria-invalid={errorAxis === 'x'}
            className={rangeClass('x')}
          />
        </div>
        <div>
          <label htmlFor="param-ymin" className={LABEL}>
            Y min
          </label>
          <input
            id="param-ymin"
            type="number"
            step={0.5}
            min={MIN_EDGE}
            max={MAX_EDGE}
            value={yMin}
            onChange={(e) => {
              setYMin(e.target.value);
              commitRange('y', e.target.value, yMax);
            }}
            aria-invalid={errorAxis === 'y'}
            className={rangeClass('y')}
          />
        </div>
        <div>
          <label htmlFor="param-ymax" className={LABEL}>
            Y max
          </label>
          <input
            id="param-ymax"
            type="number"
            step={0.5}
            min={MIN_EDGE}
            max={MAX_EDGE}
            value={yMax}
            onChange={(e) => {
              setYMax(e.target.value);
              commitRange('y', yMin, e.target.value);
            }}
            aria-invalid={errorAxis === 'y'}
            className={rangeClass('y')}
          />
        </div>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-[#EF4444]">
          {error}
        </p>
      )}
      {!error && note && <p className="mt-2 text-xs text-[#D1D5DB]">{note}</p>}

      <div className="mt-4">
        <div className="mb-1 flex items-center justify-between gap-3">
          <label htmlFor="param-resolution" className="text-xs text-[#D1D5DB]">
            Resolution
          </label>
          <input
            id="param-resolution"
            type="number"
            min={RES_MIN}
            max={RES_MAX}
            value={resolution}
            onChange={(e) => commitResolution(e.target.value)}
            className="min-h-[44px] w-20 rounded-full border border-white/10 bg-[#111111] px-2 py-2 text-right font-mono text-sm tabular-nums text-white outline-none focus:border-white focus-visible:ring-2 focus-visible:ring-white"
          />
        </div>
        <input
          type="range"
          aria-label="Resolution slider"
          min={RES_MIN}
          max={RES_MAX}
          step={8}
          value={resolution}
          onChange={(e) => commitResolution(e.target.value)}
          className="min-h-[44px] w-full accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-[#D1D5DB]">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => onChange({ showGrid: e.target.checked })}
            className="h-5 w-5 accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          />
          Grid
        </label>
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-[#D1D5DB]">
          <input
            type="checkbox"
            checked={showAxes}
            onChange={(e) => onChange({ showAxes: e.target.checked })}
            className="h-5 w-5 accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          />
          Axes
        </label>
        <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm text-[#D1D5DB]">
          <input
            type="checkbox"
            checked={wireframe}
            onChange={(e) => onChange({ wireframe: e.target.checked })}
            className="h-5 w-5 accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
          />
          Wireframe
        </label>
      </div>
    </div>
  );
}
