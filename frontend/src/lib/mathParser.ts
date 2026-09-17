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
import type { Matrix, MathNode } from 'mathjs';

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

// ponytail: derived view of GREEK_MAP values for scope checks — no second list.
export const GREEK_NAMES: ReadonlySet<string> = new Set(Object.values(GREEK_MAP));

export type Assumption = 'param-default' | 'base-omitted' | 'subscript-dropped';

export interface ScopeEntry {
  symbol: string;
  value: string | number;
  reason: string;
}

// Generic renderer: new assumption kinds need no code change — they travel
// through the DATA path (ScopeEntry), not a per-reason switch.
export function captionsFromScope(diff: ScopeEntry[]): string[] {
  return diff.map((e) => {
    if (e.value === '' || e.value === null || e.value === undefined) {
      return `Showing ${e.symbol} — ${e.reason}.`;
    }
    return `Showing ${e.symbol}=${e.value} — ${e.reason}.`;
  });
}

export function captionFor(a: Assumption): string {
  if (a === 'param-default') {
    const s = captionsFromScope([{ symbol: 'm', value: 1, reason: 'free parameter defaulted' }])[0];
    return s ?? '';
  }
  if (a === 'base-omitted') {
    const s = captionsFromScope([{ symbol: 'log₁₀(x)', value: '', reason: 'base not specified' }])[0];
    return s ?? '';
  }
  const s = captionsFromScope([{ symbol: 'x', value: '', reason: 'subscript dropped for 2D' }])[0];
  return s ?? '';
}

// P2: runtime-derived function table. Probe is expression-scope evaluation:
// known iff the name resolves to something callable in an expression
// (unknown names throw `Undefined function`). Zero hand-copied lists —
// customs (softmax/sigmoid/relu/gelu/step) are found automatically because
// registerCustomFunctions() imports them into the same instance.
const knownFuncCache = new Map<string, boolean>();

export function isKnownFunc(name: string): boolean {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) return false;
  const hit = knownFuncCache.get(name);
  if (hit !== undefined) return hit;
  const entry: unknown = (math as unknown as Record<string, unknown>)[name];
  let result = false;
  if (typeof entry === 'function') {
    try {
      math.compile(`${name}(0)`).evaluate({});
      result = true;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      result = !/Undefined function/.test(msg);
    }
  } else {
    result = false;
  }
  knownFuncCache.set(name, result);
  return result;
}

function isFuncWord(word: string): boolean {
  return isKnownFunc(word) || isKnownFunc(word.toLowerCase());
}

// P1: sole frontend parse entry. Length cap 10k, balanced-brace pre-check,
// try/catch, traverse node cap 1000. Throws Error with reason, never garbage.
export function parseExpr(expr: string): MathNode {
  if (expr.length > 10000) throw new Error('card: expression exceeds 10k length cap');
  const stack: string[] = [];
  const pairs: Record<string, string> = { ')': '(', ']': '[', '}': '{' };
  for (const ch of expr) {
    if (ch === '(' || ch === '[' || ch === '{') stack.push(ch);
    else if (ch === ')' || ch === ']' || ch === '}') {
      const want = pairs[ch];
      const got = stack.pop();
      if (got !== want) throw new Error(`card: unbalanced bracket ${ch}`);
    }
  }
  if (stack.length > 0) throw new Error('card: unbalanced brackets');
  try {
    const node = math.parse(expr);
    let count = 0;
    node.traverse(() => {
      count += 1;
      if (count > 1000) throw new Error('card: node cap 1000 exceeded');
    });
    return node;
  } catch (e) {
    if (e instanceof Error && /^card: /.test(e.message)) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`card: ${msg}`);
  }
}

// P3: traverse free SymbolNodes minus mathjs constants in the bundle
// (pi/e/tau resolve to non-functions on the instance — runtime-derived).
// Function-position symbols (fn of a FunctionNode) are bound, not free.
export function freeSymbols(node: MathNode): string[] {
  const found = new Set<string>();
  const mathRecord = math as unknown as Record<string, unknown>;
  node.traverse((child, _path, parent) => {
    const c = child as unknown as { isSymbolNode?: boolean; name?: unknown };
    if (!c.isSymbolNode || typeof c.name !== 'string') return;
    const p = parent as unknown as { isFunctionNode?: boolean; fn?: unknown } | undefined;
    if (p?.isFunctionNode === true && p.fn === child) return;
    const name = c.name;
    if (name in mathRecord && typeof mathRecord[name] !== 'function') return;
    found.add(name);
  });
  return [...found].sort();
}

// P3 scope data feeding the generic renderer. Params are singles (minus
// axes/constants) plus greek names derived from GREEK_MAP. Multi-letter
// typos are deliberately omitted — textual defaults only, typos still throw
// downstream (honest badge, never flat line).
export function scopeDiff(normalized: string): ScopeEntry[] {
  let frees: string[] = [];
  try {
    frees = freeSymbols(parseExpr(normalized));
  } catch {
    return [];
  }
  const out: ScopeEntry[] = [];
  for (const sym of frees) {
    if (sym === 'x' || sym === 'y') continue;
    if (/^[a-z]$/.test(sym)) {
      if (sym === 'e') continue;
      out.push({ symbol: sym, value: 1, reason: 'free parameter defaulted' });
    } else if (GREEK_NAMES.has(sym)) {
      out.push({ symbol: sym, value: 1, reason: 'free parameter defaulted' });
    }
  }
  return out;
}

// CARD gate: sum/integral/product and derivative forms have no bounds-capable
// numeric path in this scope — clean decline, never garbage `_` functions.
function cardReason(input: string): string | null {
  if (/\\(sum|int|prod|oint|iint|iiint)(?![a-zA-Z])/.test(input)) return 'card: summation/integral not plottable in 2D';
  if (/\\frac\s*\{\s*d/.test(input)) return 'card: derivative handled by agent C or carded';
  if (/d[A-Za-z]?\s*\/\s*d\s*x/.test(input)) return 'card: derivative handled by agent C or carded';
  return null;
}

// L0 unicode head: detect-first NFKC + punct/fraction/class maps.
// ponytail: NFKC folds fullwidth + mathematical alphanumerics (capitals
// included) with zero new deps; explicit maps cover what NFKC cannot
// (superscripts must convert BEFORE NFKC or the ^ is lost; U+2044 fraction
// slash appears only AFTER NFKC splits vulgar fractions like ½→1⁄2).
function unicodeHead(s: string): string {
  // printable-ASCII range test (no control escapes, lint-clean).
  if (!/[^ -~]/.test(s)) return s;
  const supMap: Record<string, string> = {
    '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4',
    '⁵': '5', '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9',
  };
  s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, (m) => {
    let digits = '';
    for (const ch of m) digits += supMap[ch] ?? '';
    return `^(${digits})`;
  });
  const subMap: Record<string, string> = {
    '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
    '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  };
  s = s.replace(/[₀₁₂₃₄₅₆₇₈₉]+/g, (m) => {
    let digits = '';
    for (const ch of m) digits += subMap[ch] ?? '';
    return `_${digits}`;
  });
  s = s.normalize('NFKC');
  s = s.replace(/⁄/g, '/');
  s = s.replace(/[−–—‐‑]/g, '-');
  s = s.replace(/[×⋅·∙⋆]/g, '*');
  s = s.replace(/[÷]/g, '/');
  s = s.replace(/≤/g, '<=').replace(/≥/g, '>=').replace(/≠/g, '!=');
  s = s.replace(/⟨/g, '<').replace(/⟩/g, '>');
  s = s.replace(/⌊([^⌊⌋⌈⌉]+)⌋/g, 'floor($1)');
  s = s.replace(/⌈([^⌊⌋⌈⌉]+)⌉/g, 'ceil($1)');
  const greekUnicode: Record<string, string> = {
    'α': 'alpha', 'β': 'beta', 'γ': 'gamma', 'δ': 'delta', 'ε': 'epsilon',
    'ζ': 'zeta', 'η': 'eta', 'θ': 'theta', 'ι': 'iota', 'κ': 'kappa',
    'λ': 'lambda', 'μ': 'mu', 'ν': 'nu', 'ξ': 'xi', 'ο': 'o', 'π': 'pi',
    'ρ': 'rho', 'σ': 'sigma', 'ς': 'sigma', 'τ': 'tau', 'υ': 'upsilon',
    'φ': 'phi', 'χ': 'chi', 'ψ': 'psi', 'ω': 'omega',
    'Α': 'alpha', 'Β': 'beta', 'Γ': 'gamma', 'Δ': 'delta', 'Ε': 'epsilon',
    'Ζ': 'zeta', 'Η': 'eta', 'Θ': 'theta', 'Ι': 'iota', 'Κ': 'kappa',
    'Λ': 'lambda', 'Μ': 'mu', 'Ν': 'nu', 'Ξ': 'xi', 'Ο': 'o', 'Π': 'pi',
    'Ρ': 'rho', 'Σ': 'sigma', 'Τ': 'tau', 'Υ': 'upsilon', 'Φ': 'phi',
    'Χ': 'chi', 'Ψ': 'psi', 'Ω': 'omega',
  };
  for (const [ch, name] of Object.entries(greekUnicode)) {
    if (s.includes(ch)) s = s.split(ch).join(name);
  }
  return s;
}

export function stripLatex(input: string): string {
  let s = unicodeHead(input.trim());
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
  // L1: bare trailing digits on a single letter read as subscript (y17 → y,
  // same class as X_{..} above). Multi-letter runs (log2, H2O, alpha1) never
  // match: lookarounds require a lone letter. Known funcs can't match either
  // (all multi-letter), so no isKnownFunc check needed here.
  s = s.replace(/(?<![A-Za-z0-9])([A-Za-z])(\d+)(?![A-Za-z0-9])/g, '$1');
  for (const [latex, name] of Object.entries(GREEK_MAP)) {
    s = s.split(latex).join(name);
  }
  // L1 func un-escape derives from the runtime namespace (P2) — no fork.
  // `ln` is the one alias the bundle lacks (mapped to log downstream).
  s = s.replace(/\\([A-Za-z][A-Za-z0-9]*)\b/g, (m, cmd: string) => {
    if (isKnownFunc(cmd)) return cmd;
    if (cmd === 'ln') return cmd;
    return m;
  });
  // L2: shredder deleted — unknown commands card with reason, never vanish.
  const unknown = s.match(/\\[A-Za-z][A-Za-z0-9]*/);
  if (unknown) throw new Error(`card: unknown LaTeX command ${unknown[0]}`);
  // L1: matched |..| → abs(..), after \left\right stripping.
  s = s.replace(/\|([^|]+)\|/g, 'abs($1)');
  s = s.replace(/\{/g, '(').replace(/\}/g, ')');
  return s.trim();
}

// L1 spoken tokenizer (VoxTeX semantics). Word-token passes only — never
// substring split/join (which corrupts `sometimes`→`some*`). Ordered passes:
// paren-nesting counter → multi-word funcs → postfix powers → binary ops →
// `over` LAST (exactly-one, non-empty sides, tight-binding parens, quantity
// grouping, `all over` collapse). Cards on unbalanced/depth>3/
// unknown-between-tokens/double-ops.
function tokenizeSpoken(lower: string): string[] {
  return lower.match(/[a-z][a-z0-9]*|\d+(?:\.\d+)?|<=|>=|==|!=|[()+*/^.<>=\-&|]/g) ?? [];
}

function hasSpokenTrigger(tokens: string[]): boolean {
  // Trigger vocabulary: the multi/single maps' keys plus bare comparison and
  // bare known-function words (floor, min, ...) — grammatical classes, not cases.
  // Unknown prose still cards downstream via the unknown-word check.
  for (const t of tokens) {
    if (
      t === 'sine' || t === 'cosine' || t === 'tangent' ||
      t === 'plus' || t === 'minus' || t === 'times' ||
      t === 'squared' || t === 'cubed' || t === 'over' ||
      t === 'less' || t === 'greater' || t === 'equal' || t === 'equals' ||
      t === 'floor' || t === 'ceil' || t === 'round' || t === 'min' || t === 'max' ||
      t === 'abs' || t === 'div' || t === 'mod'
    ) return true;
  }
  const seqs: string[][] = [
    ['square', 'root', 'of'], ['cube', 'root', 'of'],
    ['divided', 'by'], ['raised', 'to'], ['to', 'the', 'power', 'of'],
    ['arc', 'sine'], ['arc', 'cosine'], ['arc', 'tangent'],
    ['hyperbolic', 'sine'], ['hyperbolic', 'cosine'], ['hyperbolic', 'tangent'],
    ['natural', 'log'], ['log', 'base', '10'], ['log', 'base', '2'],
    ['absolute', 'value', 'of'], ['factorial', 'of'],
  ];
  for (const seq of seqs) {
    for (let i = 0; i + seq.length <= tokens.length; i++) {
      let ok = true;
      for (let j = 0; j < seq.length; j++) {
        if (tokens[i + j] !== seq[j]) { ok = false; break; }
      }
      if (ok) return true;
    }
  }
  return false;
}

export function spokenToMath(input: string): string {
  const lower = input.toLowerCase();
  const tokens = tokenizeSpoken(lower);
  if (!hasSpokenTrigger(tokens)) return input;
  let depth = 0;
  let maxDepth = 0;
  for (const ch of input) {
    if (ch === '(') { depth += 1; if (depth > maxDepth) maxDepth = depth; }
    else if (ch === ')') {
      depth -= 1;
      if (depth < 0) throw new Error('card: unbalanced parentheses in spoken input');
    }
  }
  if (depth !== 0) throw new Error('card: unbalanced parentheses in spoken input');
  if (maxDepth > 3) throw new Error('card: parenthesis depth>3 in spoken input');

  const multi: Array<{ src: string[]; dst: string[] }> = [
    { src: ['is', 'less', 'than', 'or', 'equal', 'to'], dst: ['<='] },
    { src: ['less', 'than', 'or', 'equal', 'to'], dst: ['<='] },
    { src: ['is', 'greater', 'than', 'or', 'equal', 'to'], dst: ['>='] },
    { src: ['greater', 'than', 'or', 'equal', 'to'], dst: ['>='] },
    { src: ['is', 'not', 'equal', 'to'], dst: ['!='] },
    { src: ['not', 'equal', 'to'], dst: ['!='] },
    { src: ['is', 'less', 'than'], dst: ['<'] },
    { src: ['less', 'than'], dst: ['<'] },
    { src: ['is', 'greater', 'than'], dst: ['>'] },
    { src: ['greater', 'than'], dst: ['>'] },
    { src: ['is', 'equal', 'to'], dst: ['='] },
    { src: ['equal', 'to'], dst: ['='] },
    { src: ['equals'], dst: ['='] },
    { src: ['to', 'the', 'power', 'of'], dst: ['^'] },
    { src: ['square', 'root', 'of'], dst: ['sqrt'] },
    { src: ['cube', 'root', 'of'], dst: ['cbrt'] },
    { src: ['hyperbolic', 'sine'], dst: ['sinh'] },
    { src: ['hyperbolic', 'cosine'], dst: ['cosh'] },
    { src: ['hyperbolic', 'tangent'], dst: ['tanh'] },
    { src: ['absolute', 'value', 'of'], dst: ['abs'] },
    { src: ['natural', 'log'], dst: ['log'] },
    { src: ['log', 'base', '10'], dst: ['log10'] },
    { src: ['log', 'base', '2'], dst: ['log2'] },
    { src: ['arc', 'sine'], dst: ['asin'] },
    { src: ['arc', 'cosine'], dst: ['acos'] },
    { src: ['arc', 'tangent'], dst: ['atan'] },
    { src: ['factorial', 'of'], dst: ['factorial'] },
    { src: ['divided', 'by'], dst: ['/'] },
    { src: ['raised', 'to'], dst: ['^'] },
  ];
  let out: string[] = [];
  for (let i = 0; i < tokens.length;) {
    let matched = false;
    for (const { src, dst } of multi) {
      if (i + src.length > tokens.length) continue;
      let ok = true;
      for (let j = 0; j < src.length; j++) {
        if (tokens[i + j] !== src[j]) { ok = false; break; }
      }
      if (ok) {
        out.push(...dst);
        i += src.length;
        matched = true;
        break;
      }
    }
    if (!matched) { out.push(tokens[i] ?? ''); i += 1; }
  }
  const single: Record<string, string> = {
    'sine': 'sin', 'cosine': 'cos', 'tangent': 'tan',
    'plus': '+', 'minus': '-', 'times': '*',
    'squared': '^(2)', 'cubed': '^(3)',
  };
  out = out.map((t) => single[t] ?? t);
  // `all over` collapses to one `over` before the exactly-one check.
  const collapsed: string[] = [];
  for (let i = 0; i < out.length; i++) {
    if (out[i] === 'all' && out[i + 1] === 'over') continue;
    collapsed.push(out[i] ?? '');
  }
  out = collapsed;
  const overIdx: number[] = [];
  out.forEach((t, i) => { if (t === 'over') overIdx.push(i); });
  if (overIdx.length > 1) throw new Error('card: multiple over in one expression');
  if (overIdx.length === 1) {
    const k = overIdx[0] ?? 0;
    const left = (out.slice(0, k)).filter((t) => t !== 'quantity');
    const right = (out.slice(k + 1)).filter((t) => t !== 'quantity');
    if (left.length === 0 || right.length === 0) throw new Error('card: over needs non-empty sides');
    out = ['(', ...left, ')', '/', '(', ...right, ')'];
  }
  // Articles `the`/`an` are never math symbols (multi-letter non-func words
  // would card) — drop, don't card. `of` drops only before `(` (floor of (x)
  // → floor (x), valid application); bare `of` keeps carding honestly.
  // Single-letter `a` stays: valid parameter.
  out = out.filter((t, i) => {
    if (t === 'the' || t === 'an') return false;
    if (t === 'of') return !(out[i + 1] ?? '').startsWith('(');
    return true;
  });
  const mathRecord = math as unknown as Record<string, unknown>;
  for (const t of out) {
    if (!/^[a-z][a-z0-9]*$/.test(t)) continue;
    if (t.length === 1) continue;
    if (t === 'quantity' || t === 'all' || t === 'over') {
      throw new Error(`card: unexpected spoken word ${t}`);
    }
    if (isKnownFunc(t)) continue;
    if (GREEK_NAMES.has(t)) continue;
    if (t in mathRecord && typeof mathRecord[t] !== 'function') continue;
    throw new Error(`card: unknown word between tokens ${t}`);
  }
  // Postfix ^(2)/^(3) terminate an operand — `x^2 + 1` is valid sequencing,
  // so only bare binary ops count for double-ops. A binary directly feeding
  // a postfix (`+ ^(2)`) or two postfixes in a row have no base → card.
  const isBin = (t: string): boolean =>
    t === '+' || t === '-' || t === '*' || t === '/' || t === '^';
  const isPost = (t: string): boolean => t.startsWith('^(');
  if (out.length > 0) {
    const first = out[0] ?? '';
    const last = out[out.length - 1] ?? '';
    if (isPost(first)) throw new Error('card: leading operator');
    if (isBin(first) && first !== '-' && first !== '+') throw new Error('card: leading operator');
    if (isBin(last)) throw new Error('card: trailing operator');
    for (let i = 0; i + 1 < out.length; i++) {
      const a = out[i] ?? '';
      const b = out[i + 1] ?? '';
      if (isBin(a) && (isBin(b) || isPost(b))) {
        throw new Error('card: double operators in spoken input');
      }
      if (isPost(a) && isPost(b)) {
        throw new Error('card: double operators in spoken input');
      }
    }
  }
  return out.join(' ');
}

// Func-prefix split derives from the runtime namespace (P2): sinx→sin(x),
// log2x→log2(x). Longest-prefix scan so log2 wins over log. Case-folds
// unicode/fullwidth capitals (SIN→sin). Kept because the tokenizer only sees
// space-separated words — glued `sinx` never reaches it.
function splitFuncPrefix(expr: string): string {
  return expr.replace(/\b([A-Za-z][A-Za-z0-9]*)\b/g, (word) => {
    if (isKnownFunc(word)) return word;
    for (let len = word.length - 1; len >= 2; len--) {
      const pre = word.slice(0, len);
      const rest = word.slice(len);
      if (!/^[A-Za-z0-9]+$/.test(rest) || rest.length === 0) continue;
      if (isKnownFunc(pre)) return `${pre}(${rest})`;
      if (isKnownFunc(pre.toLowerCase())) return `${pre.toLowerCase()}(${rest})`;
    }
    if (isKnownFunc(word.toLowerCase())) return word.toLowerCase();
    return word;
  });
}

export function addImplicitMultiply(input: string): string {
  let s = splitFuncPrefix(input);
  // Word-space-word: alpha x→alpha*x; func-space-arg: sin x→sin(x).
  s = s.replace(/\b([a-zA-Z][a-zA-Z0-9]*)\s+([a-zA-Z][a-zA-Z0-9]*|\()/g, (_m: string, l: string, r: string) => {
    if (isFuncWord(l)) return r === '(' ? `${l} (` : `${l}(${r})`;
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
    // Comparison/logical tails never take implicit multiply: `)<=` stays.
    if (cur === ')' && nxt !== ')' && nxt !== ']' && nxt !== ',' && nxt !== ' ' && !'+-*/^'.includes(nxt) && !'<>=!&|'.includes(nxt)) {
      out.push('*');
    }

    if (/\d/.test(cur) && nxt === '(') {
      if (!isFuncWord(wordAt(i))) out.push('*');
    }

    if (/\d/.test(cur) && /[a-zA-Z]/.test(nxt)) {
      let word = '';
      for (let j = i + 1; j < chars.length && /[a-zA-Z]/.test(chars[j] ?? ''); j++) {
        word += chars[j];
      }
      if (!isFuncWord(word)) {
        out.push('*');
      }
    }

    // L4 letter↔digit: x2→x*2 (digit→letter above covers 2x). Exempt known
    // funcs (log2 stays) via runtime gate.
    if (/[a-zA-Z]/.test(cur) && /\d/.test(nxt)) {
      if (!isFuncWord(wordAt(i))) out.push('*');
    }

    if (cur === ')' && /\d/.test(nxt)) {
      out.push('*');
    }

    if (/[a-zA-Z]/.test(cur) && nxt === '(') {
      let word = '';
      let start = i;
      while (start > 0 && /[a-zA-Z]/.test(chars[start - 1] ?? '')) start--;
      for (let j = start; j <= i; j++) word += chars[j];
      if (!isFuncWord(word)) {
        out.push('*');
      }
    }
  }

  return splitFuncPrefix(out.join(''));
}

// Side-select gate derives from the AST (P3): expand glued x (mx/2x/)x —
// the one place the word tokenizer cannot reach — then free-symbols.
// ponytail: 1-line expand dup avoids a mathParser↔plotMeta import cycle.
function hasXVar(s: string): boolean {
  try {
    const expanded = s.replace(/([A-Za-z0-9)])(x)(?![A-Za-z0-9_(])/g, '$1*$2');
    return freeSymbols(parseExpr(expanded)).includes('x');
  } catch {
    return /(^|[^A-Za-z0-9])x(?![A-Za-z0-9])/.test(s);
  }
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
  // Bare trailing digits (y17) take the same subscript reading as X_{..} above.
  if (/(?<![A-Za-z0-9])[A-Za-z]\d+(?![A-Za-z0-9])/.test(input) && !assumptions.includes('subscript-dropped')) {
    assumptions.push('subscript-dropped');
  }

  let s = input.trim().replace(LEADING_STRIP, '');
  s = stripLatex(s);

  // mathjs bundle has log/log10/log2 but no ln alias: map standard ln(x) to log(x).
  s = s.replace(/\bln\s*\(/g, 'log(');

  s = spokenToMath(s);

  s = s.replace(/\^2/g, '^(2)');
  s = s.replace(/\^3/g, '^(3)');
  s = s.replace(/\s+\^/g, '^');

  s = addImplicitMultiply(s);

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
  // Derived from the AST (P3): free symbols minus axes, singles + greek only
  // so multi-letter typos still throw downstream instead of defaulting.
  try {
    const frees = freeSymbols(parseExpr(s));
    const isParam = (sym: string): boolean => {
      if (sym === 'x' || sym === 'y') return false;
      if (/^[a-z]$/.test(sym)) return sym !== 'e';
      return GREEK_NAMES.has(sym);
    };
    if (frees.some(isParam) && !assumptions.includes('param-default')) {
      assumptions.push('param-default');
    }
  } catch {
    // Unparsable here means compile will badge downstream — no assumption.
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

  s = spokenToMath(s);

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

// Compatibility alias for render files outside this task's ownership
// (Plot2D inspectParts, RegionPlot stripFuncCalls). The hand-copied fork is
// deleted: this set is derived from the runtime namespace via isKnownFunc,
// so it can only diverge by failing the P-core equality test, never by edit.
function computeFuncNames(): Set<string> {
  const out = new Set<string>();
  const rec = math as unknown as Record<string, unknown>;
  for (const k of Object.keys(rec)) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(k)) continue;
    if (isKnownFunc(k)) out.add(k);
  }
  return out;
}

export const FUNC_NAMES: ReadonlySet<string> = computeFuncNames();

export { math };
export type { MathJsStatic } from 'mathjs';
