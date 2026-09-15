import { classifyVizMode } from './vizClassifier';
import type { Equation } from '../types';

const SAMPLE_LATEX: Array<{ latex: string; type: string; template?: string }> = [
  { latex: 'sin(x) + cos(y)', type: 'trigonometric', template: 'TrigSurface' },
  { latex: 'E = mc^2', type: 'physics' },
];

export function getSampleEquations(): Equation[] {
  return SAMPLE_LATEX.map((eq) => ({
    ...eq,
    vizMode: classifyVizMode(eq.latex, eq.type),
  }));
}
