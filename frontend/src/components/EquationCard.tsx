interface EquationCardProps {
  latex: string
  type: string
  template?: string
  onSelect: () => void
}

export function EquationCard({ latex, type, template, onSelect }: EquationCardProps) {
  return (
    <button
      onClick={onSelect}
      className="flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-left transition-colors hover:border-zinc-600 hover:bg-zinc-900"
    >
      <p className="font-mono text-sm text-zinc-200 break-all line-clamp-3">{latex}</p>
      <div className="flex flex-wrap gap-1.5">
        <span className="inline-flex items-center rounded-full bg-zinc-800 px-2 py-0.5 text-xs font-medium text-zinc-300">
          {type}
        </span>
        {template && (
          <span className="inline-flex items-center rounded-full bg-blue-900/40 px-2 py-0.5 text-xs font-medium text-blue-300">
            {template}
          </span>
        )}
      </div>
    </button>
  )
}
