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
      className={`flex min-h-[44px] w-full items-center gap-2 rounded-lg border p-2 transition-colors ${
        selected ? 'border-zinc-400 bg-zinc-900' : 'border-zinc-800 bg-zinc-950'
      }`}
    >
      <button
        type="button"
        aria-label={`Select ${row.latex}`}
        aria-pressed={selected}
        onClick={() => onSelect(row.id)}
        style={{ backgroundColor: row.color }}
        className="h-4 w-4 shrink-0 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      />
      <input
        aria-label="Equation"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
        }}
        className="min-w-0 flex-1 bg-transparent font-mono text-sm text-zinc-100 outline-none"
      />
      <button
        type="button"
        aria-label={row.visible ? `Hide ${row.latex}` : `Show ${row.latex}`}
        aria-pressed={row.visible}
        onClick={() => onToggle(row.id)}
        className="min-h-[44px] min-w-[44px] shrink-0 rounded-md px-2 text-sm text-zinc-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        {row.visible ? '👁' : '🚫'}
      </button>
      <button
        type="button"
        aria-label={`Duplicate ${row.latex}`}
        onClick={() => onDuplicate(row.id)}
        className="min-h-[44px] min-w-[44px] shrink-0 rounded-md px-2 text-sm text-zinc-300 hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400"
      >
        ⧉
      </button>
    </li>
  );
}

export function ExpressionList({ rows, selectedId, onSelect, onToggle, onDuplicate, onEdit }: ExpressionListProps) {
  if (rows.length === 0) {
    return <p className="text-sm text-zinc-500">Extract or type an equation to begin.</p>;
  }
  return (
    <ul className="grid gap-3">
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
