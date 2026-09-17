export function isFunctionLike(type: string): boolean {
  const t = type.toLowerCase();
  return (
    t.includes('trig') ||
    t.includes('poly') ||
    t.includes('exp') ||
    t.includes('log') ||
    t.includes('hyperbolic') ||
    t.includes('generic') ||
    t.includes('function')
  );
}

// Function-call names stripped (when followed by `(`) before x-detection, so the
// x in `max (` / `exp (` can't fake an x-variable. ponytail: pure regex, no
// mathjs import — parse isn't in the tree-shaken bundle.
const FUNC_CALL = /\\?\b(asin|acos|atan|sinh|cosh|tanh|sin|cos|tan|exp|log|ln|sqrt|cbrt|max|min|abs)\s*\(/g;

function hasXVar(s: string): boolean {
  const t = s.replace(FUNC_CALL, '(');
  return (
    /(^|[^A-Za-z0-9_)])x(?![A-Za-z0-9_(])/.test(t) || /[A-Za-z0-9)]x(?![A-Za-z0-9_(])/.test(t)
  );
}

// Letter/digit-glued implicit multiply around x (`mx`/`2x`/`)x` → `m*x`/...).
// X-specific on purpose: a general letter-letter split would shred multi-letter
// symbols (`alpha`). `ex` ambiguity: `ex` the variable renders as `e*x`
// (mathjs constant e) — accepted, failures land on the honest `not plottable`
// badge downstream. Idempotent (`m*x` is stable) and func-call safe (`exp(x)`,
// `max(a,b)` untouched: the x there is followed by `(`/a letter).
export function expandGluedX(expr: string): string {
  return expr.replace(/([A-Za-z0-9)])(x)(?![A-Za-z0-9_(])/g, '$1*$2');
}

// Plottable side of an equation, or null. Operates on the NORMALIZED shape:
// mirrors normalizeInput's leading `Name =` / `f(x) =` strip (same regex), then
// if a top-level `=` remains, prefers the RHS side with an x-variable, else the
// LHS; with no `=` returns the whole expression when it has an x-variable.
// Covers letter-glued forms (`mx`) normalizeInput leaves glued. Returns the raw
// side — the renderer applies expandGluedX before compile.
export function plotSide(latex: string): string | null {
  const s = latex
    .trim()
    .replace(/^[a-zA-Z][a-zA-Z0-9]*(\([^)]*\))?\s*=\s*/, '');
  const eq = s.search(/(?<![=!<>])=(?![=<>])/);
  const sides = eq >= 0 ? [s.slice(eq + 1), s.slice(0, eq)] : [s];
  for (const side of sides) {
    const t = side.trim();
    if (t && hasXVar(t)) return t;
  }
  return null;
}
// Free symbols default to 1 (mirrors Plot2D's DEFAULT_SCOPE, minus x/y which are
// 3D axes here, minus e/pi/tau which are mathjs constants). Word boundaries keep
// function names (sin, sqrt, log10) untouched. ponytail: regex, not mathjs parse —
// parse isn't in the tree-shaken bundle and this covers the blessed set exactly.
// Textual defaults only; multi-letter typos still throw (honest badge, never flat line).
const FREE_SINGLE = new Set(
  [...'abcdefghijklmnopqrstuvwxyz'].filter((c) => c !== 'x' && c !== 'y' && c !== 'e'),
);
// ponytail: pi/tau excluded (mathjs constants, not params).
const FREE_GREEK = new Set([
  'alpha', 'beta', 'gamma', 'delta', 'epsilon', 'zeta', 'eta', 'theta',
  'iota', 'kappa', 'lambda', 'mu', 'nu', 'xi', 'rho',
  'sigma', 'upsilon', 'phi', 'chi', 'psi', 'omega',
]);

export function defaultFreeParams(expr: string): string {
  const singles = expr.replace(/\b([a-z])\b/g, (name) => (FREE_SINGLE.has(name) ? '(1)' : name));
  return singles.replace(
    /\b(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|rho|sigma|upsilon|phi|chi|psi|omega)\b/g,
    (name) => (FREE_GREEK.has(name) ? '(1)' : name),
  );
}

export function showDimensionToggle(type: string, latex: string): boolean {
  return isFunctionLike(type) || (type !== 'matrix' && plotSide(latex) !== null);
}

export function hintFor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes('trig')) return 'raise k to pack waves tighter';
  if (t.includes('poly')) return 'raise degree to steepen the curve';
  if (t.includes('hyperbolic')) return 'raise scale to widen the curve';
  if (t.includes('exp')) return 'raise base to steepen growth';
  if (t.includes('log')) return 'raise base to flatten the curve';
  if (t.includes('matrix')) return 'darker shade means larger value';
  if (t.includes('distrib') || t.includes('prob') || t.includes('stat'))
    return 'shape follows the parameter values';
  if (t.includes('ode')) return 'slope at each point sets the curve';
  if (t.includes('generic') || t.includes('function'))
    return 'change a number to shift the curve';
  return 'no tuning available for this type';
}
