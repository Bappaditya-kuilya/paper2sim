import { describe, test, expect } from 'vitest';
import { normalizeWithMeta, captionFor, math } from '../lib/mathParser';
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
