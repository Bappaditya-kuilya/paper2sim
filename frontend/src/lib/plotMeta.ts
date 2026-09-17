import { parseExpr, freeSymbols, GREEK_NAMES } from './mathParser';

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

// P3 AST gate: function-call awareness comes from parse (free-symbols),
// not a hand-copied FUNC_CALL list. The x in `max (` / `exp (` is a bound
// function name there, so it can never fake an x-variable.
function hasXVar(s: string): boolean {
  try {
    return freeSymbols(parseExpr(expandGluedX(s))).includes('x');
  } catch {
    return /(^|[^A-Za-z0-9])x(?![A-Za-z0-9])/.test(s);
  }
}

// Letter/digit-glued implicit multiply around x (`mx`/`2x`/`)x` → `m*x`/...).
// X-specific on purpose: a general letter-letter split would shred multi-letter
// symbols (`alpha`). `ex` ambiguity: `ex` the variable renders as `e*x`
// (mathjs constant e) — accepted, failures land on the honest `not plottable`
// badge downstream. Idempotent (`m*x` is stable) and func-call safe (`exp(x)`,
// `max(a,b)` untouched: the x there is followed by `(`/a letter).
// Kept because the word tokenizer only sees space-separated words — glued
// `mx`/`2x` never reach it. One regex line, justified.
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
// 3D axes here, minus e/pi/tau which are mathjs constants). Derived from the
// AST (P3): parse → free-symbols → default singles + greek names from the
// mathParser TeX map. Textual defaults only; multi-letter typos still throw
// (honest badge, never flat line).
export function defaultFreeParams(expr: string): string {
  let frees: string[] = [];
  try {
    frees = freeSymbols(parseExpr(expr));
  } catch {
    return expr;
  }
  let out = expr;
  for (const sym of frees) {
    if (sym === 'x' || sym === 'y') continue;
    if (/^[a-z]$/.test(sym)) {
      if (sym === 'e') continue;
      out = out.replace(new RegExp(`\\b${sym}\\b`, 'g'), '(1)');
    } else if (GREEK_NAMES.has(sym)) {
      out = out.replace(new RegExp(`\\b${sym}\\b`, 'g'), '(1)');
    }
  }
  return out;
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
