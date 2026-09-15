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

export function stripLatex(input: string): string {
  let s = input.trim();
  s = s.replace(/\\sqrt\{([^}]+)\}/g, 'sqrt($1)');
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)');
  s = s.replace(/\\left\(/g, '(').replace(/\\right\)/g, ')');
  s = s.replace(/\\left\[/g, '[').replace(/\\right\]/g, ']');
  s = s.replace(/\\langle/g, '<').replace(/\\rangle/g, '>');
  s = s.replace(/\\cdot/g, '*').replace(/\\times/g, '*').replace(/\\div/g, '/');
  s = s.replace(/\\pm/g, '+');
  s = s.replace(/\^\{([^}]+)\}/g, '^($1)');
  s = s.replace(/_\{([^}]+)\}/g, '_($1)');
  s = s.replace(/\^([a-zA-Z0-9])/g, '^($1)');
  s = s.replace(/_([a-zA-Z0-9])/g, '_($1)');
  for (const [latex, name] of Object.entries(GREEK_MAP)) {
    s = s.split(latex).join(name);
  }
  s = s.replace(/\\(sin|cos|tan|sec|csc|cot|asin|acos|atan|sinh|cosh|tanh|log|ln|log2|log10|sqrt|cbrt|abs|exp|factorial|ceil|floor|round)\b/g, '$1');
  s = s.replace(/\\[a-zA-Z]+/g, '');
  s = s.replace(/\{/g, '(').replace(/\}/g, ')');
  return s.trim();
}

function isFunctionWord(word: string): boolean {
  return FUNC_NAMES.has(word);
}

export function addImplicitMultiply(input: string): string {
  const chars = input.split('');
  const out: string[] = [];

  for (let i = 0; i < chars.length; i++) {
    out.push(chars[i]);
    if (i + 1 >= chars.length) continue;

    const cur = chars[i];
    const nxt = chars[i + 1];
    if (cur === ')' && nxt !== ')' && nxt !== ']' && nxt !== ',' && nxt !== ' ' && !'+-*/^'.includes(nxt)) {
      out.push('*');
    }

    if (/\d/.test(cur) && nxt === '(') {
      out.push('*');
    }

    if (/\d/.test(cur) && /[a-zA-Z]/.test(nxt)) {
      let word = '';
      for (let j = i + 1; j < chars.length && /[a-zA-Z]/.test(chars[j]); j++) {
        word += chars[j];
      }
      if (!isFunctionWord(word)) {
        out.push('*');
      }
    }

    if (cur === ')' && /\d/.test(nxt)) {
      out.push('*');
    }

    if (/[a-zA-Z]/.test(cur) && nxt === '(') {
      let word = '';
      let start = i;
      while (start > 0 && /[a-zA-Z]/.test(chars[start - 1])) start--;
      for (let j = start; j <= i; j++) word += chars[j];
      if (!isFunctionWord(word)) {
        out.push('*');
      }
    }
  }

  return out.join('');
}

export function normalizeInput(input: string): string {
  let s = input.trim();

  s = s.replace(/^[a-zA-Z][a-zA-Z0-9]*(\([^)]*\))?\s*=\s*/, '');

  s = stripLatex(s);

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

export { math };
export type { MathJsStatic } from 'mathjs';
