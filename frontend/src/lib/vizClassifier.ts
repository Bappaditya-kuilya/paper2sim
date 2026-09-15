const VAR_PATTERN = /\b[x-yuvt]\b/gi;

const SURFACE_TYPES = new Set([
  'trigonometric',
  'polynomial',
  'exponential',
  'logarithmic',
  'hyperbolic',
]);

function countVariables(latex: string): number {
  const vars = new Set<string>();
  for (const m of latex.matchAll(VAR_PATTERN)) {
    vars.add(m[0].toLowerCase());
  }
  return vars.size;
}

export function classifyVizMode(latex: string, type: string): '3d' | 'info' {
  if (SURFACE_TYPES.has(type) && countVariables(latex) >= 2) return '3d';
  if (type === 'function' && countVariables(latex) >= 2) return '3d';
  return 'info';
}
