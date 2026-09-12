import { EquationCard } from './EquationCard'

interface Equation {
  latex: string
  type: string
  template?: string
}

interface EquationListProps {
  equations: Equation[]
  loading: boolean
  onSelect: (eq: Equation) => void
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-lg border border-zinc-800 bg-zinc-950 p-4">
      <div className="mb-2 h-4 w-3/4 rounded bg-zinc-800" />
      <div className="mb-2 h-4 w-1/2 rounded bg-zinc-800" />
      <div className="flex gap-1.5">
        <div className="h-5 w-14 rounded-full bg-zinc-800" />
        <div className="h-5 w-16 rounded-full bg-zinc-800" />
      </div>
    </div>
  )
}

export function EquationList({ equations, loading, onSelect }: EquationListProps) {
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (equations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-zinc-800 bg-zinc-950 py-16 text-center">
        <svg className="mb-3 h-10 w-10 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
        <p className="text-sm text-zinc-500">No equations extracted yet</p>
        <p className="mt-1 text-xs text-zinc-600">Submit a paper or equation to get started</p>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {equations.map((eq) => (
        <EquationCard
          key={eq.latex}
          latex={eq.latex}
          type={eq.type}
          template={eq.template}
          onSelect={() => onSelect(eq)}
        />
      ))}
    </div>
  )
}
