export const JOB_STEPS = ['Ingest', 'Analyze', 'Generate', 'Execute', 'Summarize'] as const;

// Maps pipeline status → stepper index (PRD §5: 5-stage progress).
export function jobStepIndex(status: string): number {
  switch (status) {
    case 'queued':
    case 'ingesting':
      return 0;
    case 'analyzing':
      return 1;
    case 'generating':
      return 2;
    case 'executing':
    case 'repairing':
      return 3;
    default:
      return 4;
  }
}

export function isTerminal(status: string): boolean {
  return status === 'completed' || status === 'failed';
}
