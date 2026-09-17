import { freeSymbols, normalizeInput, parseExpr } from '../lib/mathParser';
import { expandGluedX } from '../lib/plotMeta';
import type { Row } from '../lib/expressionRows';

interface ParamSlidersProps {
  row: Row;
  onChange(patch: Row['params']): void;
}

const EXCLUDED = new Set(['x', 'y', 'e', 'pi', 'tau']);

export function ParamSliders({ row, onChange }: ParamSlidersProps) {
  let candidates: string[];
  try {
    candidates = freeSymbols(parseExpr(expandGluedX(normalizeInput(row.latex)))).filter((s) => !EXCLUDED.has(s));
  } catch {
    return null;
  }
  if (candidates.length === 0) return null;
  return (
    <div className="mt-2 flex flex-col gap-3">
      {candidates.map((sym) => {
        const p = row.params[sym];
        const min = p?.min ?? -10;
        const max = p?.max ?? 10;
        const step = p?.step ?? 0.1;
        const value = p?.value ?? 1;
        const id = `param-${row.id}-${sym}`;
        return (
          <div key={sym}>
            <div className="mb-1 flex items-center justify-between gap-3">
              <label htmlFor={id} className="font-mono text-xs text-[#D1D5DB]">
                {sym}
              </label>
              <output htmlFor={id} className="font-mono text-xs tabular-nums text-white">
                {value}
              </output>
            </div>
            <input
              id={id}
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange({ ...row.params, [sym]: { value: v, min, max, step } });
              }}
              className="min-h-[44px] w-full accent-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
            />
          </div>
        );
      })}
    </div>
  );
}
