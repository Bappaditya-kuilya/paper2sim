import { useState } from 'react';
import type { Row } from '../lib/expressionRows';

interface ExpressionListProps {
  rows: Row[];
  selectedId: string | null;
  onSelect(id: string): void;
  onToggle(id: string): void;
  onDuplicate(id: string): void;
  onEdit(id: string, latex: string): void;
}

function RowItem({
  row,
  selected,
  onSelect,
  onToggle,
  onDuplicate,
  onEdit,
}: {
  row: Row;
  selected: boolean;
  onSelect(id: string): void;
  onToggle(id: string): void;
  onDuplicate(id: string): void;
  onEdit(id: string, latex: string): void;
}) {
  const [draft, setDraft] = useState(row.latex);
  const [synced, setSynced] = useState(row.latex);
  if (synced !== row.latex) {
    setSynced(row.latex);
    setDraft(row.latex);
  }

  const commit = () => {
    if (draft !== row.latex) onEdit(row.id, draft);
  };

  return (
    <li
      className={`flex min-h-[44px] w-full items-center gap-2 rounded-lg border p-2 transition-all duration-200 ${
        selected ? 'border-white/30 bg-[#111111]' : 'border-white/10 bg-[#111111] hover:border-white/20'
      }`}
    >
      <button
        type="button"
        aria-label={`Select ${row.latex}`}
        aria-pressed={selected}
        onClick={() => onSelect(row.id)}
        style={{ backgroundColor: row.color }}
        className="h-4 w-4 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
      />
      <input
        aria-label="Equation"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="min-w-0 flex-1 bg-transparent font-mono text-sm tabular-nums text-zinc-100 outline-none"
      />
      <button
        type="button"
        aria-label={row.visible ? `Hide ${row.latex}` : `Show ${row.latex}`}
        aria-pressed={row.visible}
        onClick={() => onToggle(row.id)}
        className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-[#374151] px-2 text-sm text-white transition-all duration-200 hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[.98]"
      >
        {row.visible ? (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        ) : (
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
            <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
            <line x1="1" y1="1" x2="23" y2="23" />
          </svg>
        )}
      </button>
      <button
        type="button"
        aria-label={`Duplicate ${row.latex}`}
        onClick={() => onDuplicate(row.id)}
        className="inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-full bg-[#374151] px-2 text-sm text-white transition-all duration-200 hover:bg-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[.98]"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      </button>
    </li>
  );
}

export function ExpressionList({ rows, selectedId, onSelect, onToggle, onDuplicate, onEdit }: ExpressionListProps) {
  if (rows.length === 0) {
    return <p className="rounded-lg border border-dashed border-white/10 bg-black px-4 py-6 text-center text-sm text-[#D1D5DB] md:col-span-2">Extract or type an equation to begin.</p>;
  }
  return (
    <ul className="grid min-w-0 content-start gap-3 tabular-nums">
      {rows.map((row) => (
        <RowItem
          key={row.id}
          row={row}
          selected={row.id === selectedId}
          onSelect={onSelect}
          onToggle={onToggle}
          onDuplicate={onDuplicate}
          onEdit={onEdit}
        />
      ))}
    </ul>
  );
}
