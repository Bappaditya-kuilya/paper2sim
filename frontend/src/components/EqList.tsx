import type { Equation } from '../lib/extractApi';
import { showDimensionToggle } from '../lib/plotMeta';

interface EqListProps {
  equations: Equation[];
  selected: number;
  onSelect(i: number): void;
  loading: boolean;
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

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-2 h-4 w-3/4 rounded bg-zinc-800" />
      <div className="mb-2 h-4 w-1/2 rounded bg-zinc-800" />
      <div className="h-5 w-16 rounded-full bg-zinc-800" />
    </div>
  );
}

export function EqList({ equations, selected, onSelect, loading }: EqListProps) {
  if (loading) {
    return (
      <div className="grid gap-3" aria-hidden="true">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    );
  }

  return (
    <ul className="grid gap-3">
      {equations.slice(0, 200).map((eq, i) => {
        const text = eqText(eq);
        const type = eqType(eq);
        const active = i === selected;
        return (
          <li key={`${text}-${i}`}>
            <button
              type="button"
              onClick={() => onSelect(i)}
              aria-current={active}
              className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 ${
                active
                  ? 'border-zinc-400 bg-zinc-900'
                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-900'
              }`}
            >
              <span className="min-w-0 flex-1 truncate font-mono text-sm text-zinc-200">{text}</span>
              <span className="inline-flex shrink-0 items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
                {type}
              </span>
              {showDimensionToggle(type, text) && (
                <span
                  aria-label="3D capable"
                  title="3D capable"
                  className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-emerald-400"
                />
              )}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
