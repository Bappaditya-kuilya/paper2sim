interface ProgressTrackerProps {
  currentStep: number
  steps: string[]
}

export function ProgressTracker({ currentStep, steps }: ProgressTrackerProps) {
  return (
    <div aria-label="Progress" className="flex items-center gap-2">
      {steps.map((step, i) => {
        const isComplete = i < currentStep
        const isCurrent = i === currentStep
        return (
          <div key={step} className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div
                aria-current={isCurrent ? 'step' : undefined}
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                  isComplete
                    ? 'bg-zinc-100 text-zinc-900'
                    : isCurrent
                    ? 'bg-zinc-700 text-zinc-100 ring-2 ring-zinc-500'
                    : 'bg-zinc-800 text-zinc-500'
                }`}
              >
                {isComplete ? (
                  <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span
                className={`hidden text-sm sm:inline ${
                  isCurrent ? 'text-zinc-100' : isComplete ? 'text-zinc-300' : 'text-zinc-500'
                }`}
              >
                {step}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`h-px w-6 sm:w-10 ${
                  isComplete ? 'bg-zinc-600' : 'bg-zinc-800'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
