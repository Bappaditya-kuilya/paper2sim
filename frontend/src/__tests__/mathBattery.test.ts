import { describe, test, expect } from 'vitest';
import {
  normalizeWithMeta,
  normalizeInput,
  captionFor,
  captionsFromScope,
  scopeDiff,
  parseExpr,
  isKnownFunc,
  freeSymbols,
  spokenToMath,
  math,
} from '../lib/mathParser';
import { plotSide, defaultFreeParams } from '../lib/plotMeta';

// INDEPENDENT truth table (measured from old code + math fact, not impl).
// Pipeline choice documented here + in mathParser.ts:
// - \log_{b}{x} with omitted/unsupported base defaults to log10(x)
//   (caption 'Showing log₁₀(x) — base not specified.').

function evalAt(expr: string, x = 2): number {
  const withDefaults = defaultFreeParams(expr);
  const code = math.compile(withDefaults);
  const v: unknown = code.evaluate({ x });
  return typeof v === 'number' ? v : Number(v);
}

const noSpace = (s: string) => s.replace(/\s+/g, '');

describe('math battery (16 frozen cases)', () => {
  test('1: y = sinx → sin(x) → 0.9092974268256817', () => {
    const { expr } = normalizeWithMeta('y = sinx');
    expect(noSpace(expr)).toBe('sin(x)');
    expect(evalAt(expr)).toBeCloseTo(0.9092974268256817, 12);
  });
  test('2: y = \\sin(x) → sin(x)', () => {
    const { expr } = normalizeWithMeta('y = \\sin(x)');
    expect(noSpace(expr)).toBe('sin(x)');
    expect(evalAt(expr)).toBeCloseTo(0.9092974268256817, 12);
  });
  test('3: frac → (x^(2)+1)/(x-1) → 5', () => {
    const { expr } = normalizeWithMeta('f(x) = \\frac{x^2 + 1}{x - 1}');
    expect(noSpace(expr)).toBe('(x^(2)+1)/(x-1)');
    expect(evalAt(expr)).toBeCloseTo(5, 12);
  });
  test('4: y = e^{x} → e^(x) → 7.3890560989306495', () => {
    const { expr } = normalizeWithMeta('y = e^{x}');
    expect(noSpace(expr)).toBe('e^(x)');
    expect(evalAt(expr)).toBeCloseTo(7.3890560989306495, 12);
  });
  test('5: sqrt → sqrt(x^(2)+1) → 2.23606797749979', () => {
    const { expr } = normalizeWithMeta('y = \\sqrt{x^2 + 1}');
    expect(noSpace(expr)).toBe('sqrt(x^(2)+1)');
    expect(evalAt(expr)).toBeCloseTo(2.23606797749979, 12);
  });
  test('6: greek → alpha*x^(2)+beta → 5, [param-default]', () => {
    const { expr, assumptions } = normalizeWithMeta('\\alpha x^2 + \\beta');
    expect(noSpace(expr)).toBe('alpha*x^(2)+beta');
    expect(assumptions).toContain('param-default');
    expect(evalAt(expr)).toBeCloseTo(5, 12);
  });
  test('7: log base → log of x, finite, [base-omitted]', () => {
    const { expr, assumptions } = normalizeWithMeta('y = \\log_{2}{x}');
    expect(assumptions).toContain('base-omitted');
    expect(expr).toMatch(/log/);
    expect(expr).toContain('x');
    expect(Number.isFinite(evalAt(expr))).toBe(true);
  });
  test('8: subscripts → x-side dropped, finite, [subscript-dropped]', () => {
    const { expr, assumptions } = normalizeWithMeta('x_{i+1} = x_i + 1');
    expect(assumptions).toContain('subscript-dropped');
    expect(expr).not.toMatch(/_/);
    expect(expr).not.toMatch(/[{}]/);
    expect(expr).toContain('x');
    expect(Number.isFinite(evalAt(expr))).toBe(true);
  });
  test('9: sum → CARD (clean decline, no _ garbage)', () => {
    expect(() => normalizeWithMeta('\\sum_{i=1}^{n} i^2')).toThrow(/card/i);
  });
  test('10: integral → CARD', () => {
    expect(() => normalizeWithMeta('\\int_0^1 x^2 dx')).toThrow(/card/i);
  });
  test('11: derivative → CARD, no garbage _ function', () => {
    let msg = '';
    try {
      const { expr } = normalizeWithMeta('\\frac{d}{dx}\\sin(x)');
      // If it returns instead of throwing, it must not contain _-garbage; compiling must throw cleanly.
      expect(expr).not.toMatch(/_\(/);
      msg = String(evalAt(expr));
    } catch (e) {
      msg = String(e);
    }
    expect(msg).not.toMatch(/Undefined function _/);
    expect(() => normalizeWithMeta('\\frac{d}{dx}\\sin(x)')).toThrow(/card/i);
  });
  test('12: y = 3x^2 + 2x + 1 → 17', () => {
    const { expr } = normalizeWithMeta('y = 3x^2 + 2x + 1');
    expect(noSpace(expr)).toBe('3*x^(2)+2*x+1');
    expect(evalAt(expr)).toBeCloseTo(17, 12);
  });
  test('13: E = mc^2 → CARD via plotSide null', () => {
    expect(plotSide('E = mc^2')).toBeNull();
  });
  test('14: y = |x| → abs(x) → 2', () => {
    const { expr } = normalizeWithMeta('y = |x|');
    expect(noSpace(expr)).toBe('abs(x)');
    expect(evalAt(expr)).toBeCloseTo(2, 12);
  });
  test('15: y = \\left|x\\right| → abs(x) → 2', () => {
    const { expr } = normalizeWithMeta('y = \\left|x\\right|');
    expect(noSpace(expr)).toBe('abs(x)');
    expect(evalAt(expr)).toBeCloseTo(2, 12);
  });
  test('16: O(r n d) → CARD via plotSide null', () => {
    expect(plotSide('O(r \\cdot n \\cdot d)')).toBeNull();
  });
});

describe('contract captions', () => {
  test('captionFor exact strings', () => {
    expect(captionFor('param-default')).toBe('Showing m=1 — free parameter defaulted.');
    expect(captionFor('base-omitted')).toBe('Showing log₁₀(x) — base not specified.');
    expect(captionFor('subscript-dropped')).toBe('Showing x — subscript dropped for 2D.');
  });
});

describe('P-core contract (parseExpr/isKnownFunc/freeSymbols)', () => {
  test('isKnownFunc derives from runtime namespace (+ customs), no fork', () => {
    expect(isKnownFunc('sin')).toBe(true);
    expect(isKnownFunc('log10')).toBe(true);
    expect(isKnownFunc('softmax')).toBe(true);
    expect(isKnownFunc('sigmoid')).toBe(true);
    expect(isKnownFunc('ln')).toBe(false);
    expect(isKnownFunc('erf')).toBe(false);
    expect(isKnownFunc('foobar')).toBe(false);
  });
  test('parseExpr caps + throws with reason, never garbage', () => {
    expect(parseExpr('sin(x)').toString()).toContain('sin');
    expect(() => parseExpr('sin(((')).toThrow(/.+/);
    expect(() => parseExpr('x'.repeat(10001))).toThrow(/.+/);
    expect(() => parseExpr('{unbalanced')).toThrow(/.+/);
  });
  test('freeSymbols traverses minus constants', () => {
    expect(freeSymbols(parseExpr('sin(x)+alpha'))).toEqual(['alpha', 'x']);
    expect(freeSymbols(parseExpr('e+pi+x'))).toEqual(['x']);
  });
});

describe('battery extension (unicode/spoken/shredder-victim, VALUE asserts)', () => {
  test('U1: U+2212 minus → x-2 → 0', () => {
    const { expr } = normalizeWithMeta('y = x−2');
    expect(noSpace(expr)).toBe('x-2');
    expect(evalAt(expr)).toBeCloseTo(0, 12);
  });
  test('U1: ⌊x⌋ → floor(x) → 2', () => {
    const { expr } = normalizeWithMeta('y = ⌊x⌋');
    expect(noSpace(expr)).toBe('floor(x)');
    expect(evalAt(expr)).toBeCloseTo(2, 12);
  });
  test('U1: fullwidth capitals NFKC → sin(x) → 0.9092974268256817', () => {
    const { expr } = normalizeWithMeta('ｙ = ｓｉｎ(ｘ)');
    expect(noSpace(expr)).toBe('sin(x)');
    expect(evalAt(expr)).toBeCloseTo(0.9092974268256817, 12);
  });
  test('U2: x squared plus 1 → x^(2)+1 → 5', () => {
    const { expr } = normalizeWithMeta('x squared plus 1');
    expect(noSpace(expr)).toBe('x^(2)+1');
    expect(evalAt(expr)).toBeCloseTo(5, 12);
  });
  test('U2: square root of x → sqrt(x) → 1.4142135623730951', () => {
    const { expr } = normalizeWithMeta('square root of x');
    expect(noSpace(expr)).toBe('sqrt(x)');
    expect(evalAt(expr)).toBeCloseTo(1.4142135623730951, 12);
  });
  test('U2: x over 2 → (x)/(2) → 1', () => {
    const { expr } = normalizeWithMeta('x over 2');
    expect(noSpace(expr)).toBe('(x)/(2)');
    expect(evalAt(expr)).toBeCloseTo(1, 12);
  });
  test('U2: quantity x plus 1 over 2 → (x+1)/(2) → 1.5', () => {
    const { expr } = normalizeWithMeta('quantity x plus 1 over 2');
    expect(noSpace(expr)).toBe('(x+1)/(2)');
    expect(evalAt(expr)).toBeCloseTo(1.5, 12);
  });
  test('L2 shredder victim: \\erf(x) cards with reason (never shredded)', () => {
    expect(() => normalizeWithMeta('\\erf(x)')).toThrow(/card/i);
    expect(() => normalizeInput('\\erf(x)')).toThrow(/card/i);
  });
  test('U2 substring trap: sometimes never becomes some*', () => {
    const out = normalizeInput('sometimes');
    expect(out).not.toMatch(/\*/);
    expect(out).toBe('sometimes');
    expect(() => math.compile(out).evaluate({ x: 2 })).toThrow(/.+/);
  });
  test('spokenToMath tokenizer entry exists and is word-based', () => {
    expect(spokenToMath('x plus y')).toContain('+');
    expect(spokenToMath('sometimes')).toBe('sometimes');
  });
  test('scopeDiff DATA path: synthetic 4th case needs no code change', () => {
    const base = scopeDiff('m*x+1');
    expect(base.some((e) => e.symbol === 'm' && e.value === 1)).toBe(true);
    const withSynthetic = [...base, { symbol: 'q', value: 2, reason: 'custom demo' }];
    const captions = captionsFromScope(withSynthetic);
    expect(captions.some((c) => c.includes('q=2') && c.includes('custom demo'))).toBe(true);
  });
});
