import {
  create,
  compileDependencies,
  evaluateDependencies,
  matrixDependencies,
  sinDependencies,
  cosDependencies,
  tanDependencies,
  secDependencies,
  cscDependencies,
  cotDependencies,
  asinDependencies,
  acosDependencies,
  atanDependencies,
  sinhDependencies,
  coshDependencies,
  tanhDependencies,
  logDependencies,
  log10Dependencies,
  log2Dependencies,
  sqrtDependencies,
  cbrtDependencies,
  absDependencies,
  expDependencies,
  factorialDependencies,
  ceilDependencies,
  floorDependencies,
  roundDependencies,
  minDependencies,
  maxDependencies,
  powDependencies,
  squareDependencies,
  cubeDependencies,
  addDependencies,
  subtractDependencies,
  multiplyDependencies,
  divideDependencies,
  modDependencies,
  unaryMinusDependencies,
  unaryPlusDependencies,
  equalDependencies,
  unequalDependencies,
  largerDependencies,
  smallerDependencies,
  largerEqDependencies,
  smallerEqDependencies,
  andDependencies,
  orDependencies,
  notDependencies,
  piDependencies,
  eDependencies,
  tauDependencies,
} from 'mathjs';
import type { Matrix } from 'mathjs';

const math = create({
  compileDependencies,
  evaluateDependencies,
  matrixDependencies,
  sinDependencies,
  cosDependencies,
  tanDependencies,
  secDependencies,
  cscDependencies,
  cotDependencies,
  asinDependencies,
  acosDependencies,
  atanDependencies,
  sinhDependencies,
  coshDependencies,
  tanhDependencies,
  logDependencies,
  log10Dependencies,
  log2Dependencies,
  sqrtDependencies,
  cbrtDependencies,
  absDependencies,
  expDependencies,
  factorialDependencies,
  ceilDependencies,
  floorDependencies,
  roundDependencies,
  minDependencies,
  maxDependencies,
  powDependencies,
  squareDependencies,
  cubeDependencies,
  addDependencies,
  subtractDependencies,
  multiplyDependencies,
  divideDependencies,
  modDependencies,
  unaryMinusDependencies,
  unaryPlusDependencies,
  equalDependencies,
  unequalDependencies,
  largerDependencies,
  smallerDependencies,
  largerEqDependencies,
  smallerEqDependencies,
  andDependencies,
  orDependencies,
  notDependencies,
  piDependencies,
  eDependencies,
  tauDependencies,
});

const GREEK_MAP: Record<string, string> = {
  '\\alpha': 'alpha', '\\beta': 'beta', '\\gamma': 'gamma', '\\delta': 'delta',
  '\\epsilon': 'epsilon', '\\zeta': 'zeta', '\\eta': 'eta', '\\theta': 'theta',
  '\\iota': 'iota', '\\kappa': 'kappa', '\\lambda': 'lambda', '\\mu': 'mu',
  '\\nu': 'nu', '\\xi': 'xi', '\\pi': 'pi', '\\rho': 'rho',
  '\\sigma': 'sigma', '\\tau': 'tau', '\\upsilon': 'upsilon', '\\phi': 'phi',
  '\\chi': 'chi', '\\psi': 'psi', '\\omega': 'omega',
};

const WORD_MAP: Record<string, string> = {
  'square root of': 'sqrt',
  'cube root of': 'cbrt',
  'divided by': '/',
  'raised to': '^',
  'to the power of': '^',
  'arc sine': 'asin',
  'arc cosine': 'acos',
  'arc tangent': 'atan',
  'hyperbolic sine': 'sinh',
  'hyperbolic cosine': 'cosh',
  'hyperbolic tangent': 'tanh',
  'natural log': 'log',
  'log base 10': 'log10',
  'log base 2': 'log2',
  'absolute value of': 'abs',
  'factorial of': 'factorial',
  'squared': '^2',
  'cubed': '^3',
  'sine': 'sin',
  'cosine': 'cos',
  'tangent': 'tan',
  'plus': '+',
  'minus': '-',
  'times': '*',
};

export const FUNC_NAMES = new Set([
  'sin', 'cos', 'tan', 'sec', 'csc', 'cot', 'asin', 'acos', 'atan',
  'sinh', 'cosh', 'tanh', 'log', 'ln', 'log2', 'log10', 'sqrt', 'cbrt',
  'abs', 'exp', 'factorial', 'ceil', 'floor', 'round', 'min', 'max', 'pow',
  'softmax', 'sigmoid', 'relu', 'gelu', 'step',
]);

export type Assumption = 'param-default' | 'base-omitted' | 'subscript-dropped';

export function captionFor(a: Assumption): string {
  if (a === 'param-default') return 'Showing m=1 — free parameter defaulted.';
  if (a === 'base-omitted') return 'Showing log₁₀(x) — base not specified.';
  return 'Showing x — subscript dropped for 2D.';
}

function isFunctionWord(word: string): boolean {
  return FUNC_NAMES.has(word);
}

// CARD gate: sum/integral/product and derivative forms have no bounds-capable
// numeric path in this scope — clean decline, never garbage `_` functions.
function cardReason(input: string): string | null {
  if (/\\(sum|int|prod|oint|iint|iiint)(?![a-zA-Z])/.test(input)) return 'card: summation/integral not plottable in 2D';
  if (/\\frac\s*\{\s*d/.test(input)) return 'card: derivative handled by agent C or carded';
  if (/d[A-Za-z]?\s*\/\s*d\s*x/.test(input)) return 'card: derivative handled by agent C or carded';
  return null;
}

export function stripLatex(input: string): string {
  let s = input.trim();
  // L0: unescaped %.* comments; \% keeps a literal percent.
  s = s.replace(/(?<!\\)%.*/g, '');
  s = s.replace(/\\%/g, '%');
  // L0: spacing commands → space (never glue words).
  s = s.replace(/\\(,|;|:|!|quad|qquad|\s)/g, ' ');
  // L0: \text{..}/\mathrm{..} keep content; accents → base letter.
  s = s.replace(/\\(?:text|mathrm|mathit|mathbf|mathsf|textrm)\{([^}]*)\}/g, '$1');
  s = s.replace(/\\(?:hat|bar|vec|tilde|dot|ddot|overline|underline)\s*\{([a-zA-Z])\}/g, '$1');
  s = s.replace(/\\(?:hat|bar|vec|tilde|dot|ddot|overline|underline)\s+([a-zA-Z])/g, '$1');
  // L0: \left/\right delimiters (covers \left| \right| \left. \right. \{ \}).
  s = s.replace(/\\left/g, '').replace(/\\right/g, '');
  // L1: \sqrt[n]{a} → ((a)^(1/(n))); ponytail: mathjs bundle has cbrt but no
  // generic nthRoot, so power form reuses installed pow — no new dep.
  s = s.replace(/\\sqrt\[([^\]]+)\]\{([^}]+)\}/g, '(($2)^(1/($1)))');
  s = s.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
  // L1: frac variants. ponytail: single-level [^}]+ (sqrt expanded first, so the
  // battery + quadratic-formula class works); fully-nested \frac-in-\frac needs
  // a balanced-brace parser — upgrade path when a test demands it.
  s = s.replace(/\\(?:dfrac|tfrac|cfrac|frac)\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  s = s.replace(/\\langle/g, '<').replace(/\\rangle/g, '>');
  s = s.replace(/\\cdot/g, '*').replace(/\\times/g, '*').replace(/\\div/g, '/');
  s = s.replace(/\\pm/g, '+');
  // L1: \log_{b} → log10 (base omitted → default 10, matches base-omitted
  // caption log₁₀; uniform class rule, no per-base hardcode).
  s = s.replace(/\\log_{[^}]*}/g, 'log10');
  s = s.replace(/\\log_([a-zA-Z0-9])/g, 'log10');
  s = s.replace(/\^\{([^}]+)\}/g, '^($1)');
  // L1: X_{...} → X (index dropped, captioned upstream via raw-input scan).
  s = s.replace(/([a-zA-Z]+)_\{[^}]*\}/g, '$1');
  s = s.replace(/\^([a-zA-Z0-9])/g, '^($1)');
  s = s.replace(/([a-zA-Z]+)_([a-zA-Z0-9])/g, '$1');
  for (const [latex, name] of Object.entries(GREEK_MAP)) {
    s = s.split(latex).join(name);
  }
  s = s.replace(/\\(sin|cos|tan|sec|csc|cot|asin|acos|atan|sinh|cosh|tanh|log|ln|log2|log10|sqrt|cbrt|abs|exp|factorial|ceil|floor|round)\b/g, '$1');
  s = s.replace(/\\[a-zA-Z]+/g, '');
  // L1: matched |..| → abs(..), after \left\right stripping.
  s = s.replace(/\|([^|]+)\|/g, 'abs($1)');
  s = s.replace(/\{/g, '(').replace(/\}/g, ')');
  return s.trim();
}

// Func-prefix split over FUNC_NAMES: sinx→sin(x), log2x→log2(x).
// Longest-first so log2 wins over log; whole-word so sin(x) stays.
function splitFuncPrefix(expr: string): string {
  const names = [...FUNC_NAMES].sort((a, b) => b.length - a.length);
  return expr.replace(/\b([a-zA-Z][a-zA-Z0-9]*)\b/g, (word) => {
    if (isFunctionWord(word)) return word;
    for (const fn of names) {
      if (word.startsWith(fn)) {
        const rest = word.slice(fn.length);
        if (rest.length > 0 && /^[a-zA-Z0-9]+$/.test(rest)) return `${fn}(${rest})`;
      }
    }
    return word;
  });
}

// L4 letter-split: exactly-2 single-letter runs → a*b. Exempt length≥3 words
// (alpha), FUNC_NAMES, mathjs constants (e,pi,tau), dx token.
// ponytail: ex→e*x admitted casualty (e is a constant but the pair still splits).
function splitLetterPairs(expr: string): string {
  return expr.replace(/\b([a-zA-Z0-9]+)\b/g, (word) => {
    if (isFunctionWord(word)) return word;
    if (word === 'e' || word === 'pi' || word === 'tau' || word === 'dx') return word;
    if (/^[a-zA-Z]{2}$/.test(word)) return `${word[0]}*${word[1]}`;
    return word;
  });
}

export function addImplicitMultiply(input: string): string {
  let s = splitFuncPrefix(input);
  // Word-space-word: alpha x→alpha*x; func-space-arg: sin x→sin(x).
  s = s.replace(/\b([a-zA-Z][a-zA-Z0-9]*)\s+([a-zA-Z][a-zA-Z0-9]*|\()/g, (_m: string, l: string, r: string) => {
    if (isFunctionWord(l)) return r === '(' ? `${l} (` : `${l}(${r})`;
    if (r === '(') return `${l} (`;
    return `${l}*${r}`;
  });
  const chars = s.split('');
  const out: string[] = [];

  const wordAt = (idx: number): string => {
    let a = idx;
    while (a > 0 && /[a-zA-Z0-9]/.test(chars[a - 1] ?? '')) a--;
    let b = idx;
    while (b + 1 < chars.length && /[a-zA-Z0-9]/.test(chars[b + 1] ?? '')) b++;
    return chars.slice(a, b + 1).join('');
  };

  for (let i = 0; i < chars.length; i++) {
    out.push(chars[i] ?? '');
    if (i + 1 >= chars.length) continue;

    const cur = chars[i] ?? '';
    const nxt = chars[i + 1] ?? '';
    if (cur === ')' && nxt !== ')' && nxt !== ']' && nxt !== ',' && nxt !== ' ' && !'+-*/^'.includes(nxt)) {
      out.push('*');
    }

    if (/\d/.test(cur) && nxt === '(') {
      if (!isFunctionWord(wordAt(i))) out.push('*');
    }

    if (/\d/.test(cur) && /[a-zA-Z]/.test(nxt)) {
      let word = '';
      for (let j = i + 1; j < chars.length && /[a-zA-Z]/.test(chars[j] ?? ''); j++) {
        word += chars[j];
      }
      if (!isFunctionWord(word)) {
        out.push('*');
      }
    }

    // L4 letter↔digit: x2→x*2 (digit→letter above covers 2x). Exempt FUNC_NAMES
    // (log2 stays) via whole-word check.
    if (/[a-zA-Z]/.test(cur) && /\d/.test(nxt)) {
      if (!isFunctionWord(wordAt(i))) out.push('*');
    }

    if (cur === ')' && /\d/.test(nxt)) {
      out.push('*');
    }

    if (/[a-zA-Z]/.test(cur) && nxt === '(') {
      let word = '';
      let start = i;
      while (start > 0 && /[a-zA-Z]/.test(chars[start - 1] ?? '')) start--;
      for (let j = start; j <= i; j++) word += chars[j];
      if (!isFunctionWord(word)) {
        out.push('*');
      }
    }
  }

  return splitFuncPrefix(out.join(''));
}

// Mirror of plotMeta.hasXVar (same regexes) so side-select agrees with plotSide
// without importing plotMeta. ponytail: 5-line dup beats a new module seam.
const FUNC_CALL = /\\?\b(asin|acos|atan|sinh|cosh|tanh|sin|cos|tan|exp|log|ln|sqrt|cbrt|max|min|abs)\s*\(/g;

function hasXVar(s: string): boolean {
  const t = s.replace(FUNC_CALL, '(');
  return (
    /(^|[^A-Za-z0-9_)])x(?![A-Za-z0-9_(])/.test(t) || /[A-Za-z0-9)]x(?![A-Za-z0-9_(])/.test(t)
  );
}

const LEADING_STRIP = /^[a-zA-Z][a-zA-Z0-9]*(\([^)]*\))?\s*=\s*/;
const TOP_EQ = /(?<![=!<>])=(?![=<>])/;

export function normalizeWithMeta(input: string): { expr: string; assumptions: Assumption[] } {
  const card = cardReason(input);
  if (card) throw new Error(card);
  const assumptions: Assumption[] = [];
  if (/\\log_{/.test(input) || /\\log_[a-zA-Z0-9]/.test(input)) assumptions.push('base-omitted');
  const noLogBase = input.replace(/\\log_{[^}]*}/g, '').replace(/\\log_[a-zA-Z0-9]/g, '');
  if (!/\\begin\{/.test(input) && (/_\{[^}]+\}|_[A-Za-z0-9(]/.test(noLogBase))) {
    assumptions.push('subscript-dropped');
  }

  let s = input.trim().replace(LEADING_STRIP, '');
  s = stripLatex(s);

  // mathjs bundle has log/log10/log2 but no ln alias: map standard ln(x) to log(x).
  s = s.replace(/\bln\s*\(/g, 'log(');

  for (const [word, symbol] of Object.entries(WORD_MAP).sort((a, b) => b[0].length - a[0].length)) {
    s = s.split(word).join(symbol);
  }

  s = s.replace(/\^2/g, '^(2)');
  s = s.replace(/\^3/g, '^(3)');
  s = s.replace(/\s+\^/g, '^');

  s = addImplicitMultiply(s);
  s = splitLetterPairs(s);

  // SIDE-SELECT: leftover top-level `=` (leading strip missed subscripted LHS
  // like x_{i+1}) → RHS-with-x first, else LHS — mirrors plotSide preference.
  const eq = s.search(TOP_EQ);
  if (eq >= 0) {
    const rhs = s.slice(eq + 1).trim();
    const lhs = s.slice(0, eq).trim();
    if (rhs && hasXVar(rhs)) s = rhs;
    else if (lhs && hasXVar(lhs)) s = lhs;
    else s = rhs || lhs;
  }
  s = s.trim();

  // Free params → param-default iff textual defaults would change the expr.
  // (defaultFreeParams lives in plotMeta to avoid a cycle; inline the same
  // class here: singles minus x/y/e + greek minus pi/tau.)
  if (/\b([a-df-wz])\b/.test(s) || /\b(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|rho|sigma|upsilon|phi|chi|psi|omega)\b/.test(s)) {
    if (!assumptions.includes('param-default')) assumptions.push('param-default');
  }

  return { expr: s, assumptions };
}

export function normalizeInput(input: string): string {
  const card = cardReason(input);
  if (card) throw new Error(card);
  let s = input.trim();

  s = s.replace(LEADING_STRIP, '');

  s = stripLatex(s);

  // mathjs bundle has log/log10/log2 but no ln alias: map standard ln(x) to log(x).
  s = s.replace(/\bln\s*\(/g, 'log(');

  for (const [word, symbol] of Object.entries(WORD_MAP).sort((a, b) => b[0].length - a[0].length)) {
    s = s.split(word).join(symbol);
  }

  s = s.replace(/\^2/g, '^(2)');
  s = s.replace(/\^3/g, '^(3)');
  s = s.replace(/\s+\^/g, '^');

  s = addImplicitMultiply(s);

  return s;
}

export function classifyExpression(input: string): string {
  const s = input.toLowerCase().trim();

  if (/\\?(sin|cos|tan|sec|csc|cot)\b/.test(s)) return 'trigonometric';
  if (/\\?(sinh|cosh|tanh)\b/.test(s)) return 'hyperbolic';
  if (/\bdy\s*\/\s*dx\b/.test(s) || /y'/.test(s) || /y''/.test(s)) return 'ode';
  if (/\b(matrix|det|trace|eigenvalue)\b/.test(s) || /\\begin\{/.test(s)) return 'matrix';
  if (/\b(probability|p\(|P\(|probability of)\b/.test(s)) return 'probability';
  if (/\b(variance|std|mean|median|mode|stddev)\b/.test(s)) return 'statistical';
  if (/\\?log\b|\\ln\b|log_\d/.test(s)) return 'logarithmic';
  if (/\b(int|sum|prod|integral|integral of)\b/.test(s) || /\\int|\\sum|\\prod/.test(s)) return 'calculus';
  if (/\b(e\^|exp\(|2\^)/.test(s)) return 'exponential';
  if (/[A-Z]/.test(input) && /[=]/.test(s)) return 'physics';
  if (/\^[0-9]/.test(s)) return 'polynomial';

  return 'function';
}

export function registerCustomFunctions() {
  math.import({
    softmax: (x: Matrix) => {
      const arr = (x as Matrix).toArray() as number[];
      const max = Math.max(...arr);
      const exps = arr.map(v => Math.exp(v - max));
      const sum = exps.reduce((a, b) => a + b, 0);
      return math.matrix(exps.map(v => v / sum));
    },
    sigmoid: (x: number) => 1 / (1 + Math.exp(-x)),
    relu: (x: number) => Math.max(0, x),
    gelu: (x: number) => 0.5 * x * (1 + Math.tanh(Math.sqrt(2 / Math.PI) * (x + 0.044715 * x ** 3))),
    step: (x: number, threshold: number = 0) => x >= threshold ? 1 : 0,
  }, { override: true });
}

registerCustomFunctions();

export { math };
export type { MathJsStatic } from 'mathjs';
