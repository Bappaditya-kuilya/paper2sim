const VAR_PATTERN = /\b[x-yuvt]\b/gi;

const SURFACE_TYPES = new Set([
  'trigonometric',
  'polynomial',
  'exponential',
  'logarithmic',
]);

// Newly-wired RendererSelector cases all render inside the Sandbox3D
// canvas (MatrixVis, ProbDiagram, DistChart, SlopeField, ForceField,
// GenericSurface for hyperbolic), so they are unconditionally '3d'.
const CANVAS_TYPES = new Set([
  'hyperbolic',
  'matrix',
  'probability',
  'statistical',
  'ode',
  'physics',
]);

function countVariables(latex: string): number {
  const vars = new Set<string>();
  for (const m of latex.matchAll(VAR_PATTERN)) {
    vars.add(m[0].toLowerCase());
  }
  return vars.size;
}

export function classifyVizMode(latex: string, type: string): '3d' | 'info' {
  if (CANVAS_TYPES.has(type)) return '3d';
  if (SURFACE_TYPES.has(type) && countVariables(latex) >= 2) return '3d';
  if (type === 'function' && countVariables(latex) >= 2) return '3d';
  return 'info';
}
