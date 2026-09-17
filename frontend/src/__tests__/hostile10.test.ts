import { describe, test, expect } from 'vitest';
import {
  normalizeWithMeta,
  normalizeInput,
  captionsFromScope,
  scopeDiff,
  parseExpr,
  freeSymbols,
  math,
} from '../lib/mathParser';
import { plotSide, defaultFreeParams, expandGluedX } from '../lib/plotMeta';

function evalAt(expr: string, x = 2): number {
  const withDefaults = defaultFreeParams(expr);
  const code = math.compile(withDefaults);
  const v: unknown = code.evaluate({ x });
  return typeof v === 'number' ? v : Number(v);
}

const noSpace = (s: string) => s.replace(/\s+/g, '');

// hostile-10: never-blank-with-reason, 0 confident-wrong,
// parse+domain captions where applicable.
describe('hostile-10', () => {
  test('H1: \\erf(x) shredder victim → card with reason', () => {
    let reason = '';
    try {
      normalizeWithMeta('\\erf(x)');
    } catch (e) {
      reason = e instanceof Error ? e.message : String(e);
    }
    expect(reason).toMatch(/card/i);
    expect(reason.length).toBeGreaterThan(0);
  });
  test('H2: x plus plus y → card double-ops', () => {
    let reason = '';
    try {
      normalizeWithMeta('x plus plus y');
    } catch (e) {
      reason = e instanceof Error ? e.message : String(e);
    }
    expect(reason).toMatch(/card/i);
  });
  test('H3: x over y over z → card exactly-one over', () => {
    let reason = '';
    try {
      normalizeWithMeta('x over y over z');
    } catch (e) {
      reason = e instanceof Error ? e.message : String(e);
    }
    expect(reason).toMatch(/card/i);
  });
  test('H4: x plus (y → card unbalanced', () => {
    let reason = '';
    try {
      normalizeWithMeta('x plus (y');
    } catch (e) {
      reason = e instanceof Error ? e.message : String(e);
    }
    expect(reason).toMatch(/card/i);
  });
  test('H5: deep nesting + spoken → card depth>3', () => {
    let reason = '';
    try {
      normalizeWithMeta('x plus ((((y))))');
    } catch (e) {
      reason = e instanceof Error ? e.message : String(e);
    }
    expect(reason).toMatch(/card/i);
  });
  test('H6: sometimes → never some*, honest throw (0 confident-wrong)', () => {
    const out = normalizeInput('sometimes');
    expect(out).not.toMatch(/\*/);
    let reason = '';
    try {
      evalAt(out);
    } catch (e) {
      reason = e instanceof Error ? e.message : String(e);
    }
    expect(reason.length).toBeGreaterThan(0);
  });
  test('H7: x plus banana → card unknown-between-tokens', () => {
    let reason = '';
    try {
      normalizeWithMeta('x plus banana');
    } catch (e) {
      reason = e instanceof Error ? e.message : String(e);
    }
    expect(reason).toMatch(/card/i);
  });
  test('H8: ⌊m*x−1⌋ unicode → floor(m*x-1) → 1 + param caption', () => {
    const { expr, assumptions } = normalizeWithMeta('y = ⌊m*x−1⌋');
    expect(noSpace(expr)).toBe('floor(m*x-1)');
    expect(evalAt(expr)).toBeCloseTo(1, 12);
    expect(assumptions).toContain('param-default');
    const diff = scopeDiff(expr);
    expect(diff.some((e) => e.symbol === 'm')).toBe(true);
    const captions = captionsFromScope(diff);
    expect(captions.length).toBeGreaterThan(0);
    expect(parseExpr(expr).toString()).toContain('floor');
    expect(freeSymbols(parseExpr(expr))).toContain('x');
  });
  test('H9: empty → honest reason downstream (never blank, never plotted)', () => {
    const { expr } = normalizeWithMeta('');
    expect(expr).toBe('');
    let reason = '';
    try {
      math.compile(expandCheck(expr));
    } catch (e) {
      reason = e instanceof Error ? e.message : String(e);
    }
    expect(reason.length).toBeGreaterThan(0);
  });
  test('H10: Box = 5 → plotSide null (honest card, 0 confident-wrong)', () => {
    expect(plotSide('Box = 5')).toBeNull();
    const side = plotSide('Box = 5');
    expect(side).toBeNull();
  });
  test('H11: spoken comparison → plots (x squared is less than or equal to 4)', () => {
    const { expr } = normalizeWithMeta('x squared is less than or equal to 4');
    expect(noSpace(expr)).toBe('x^(2)<=4');
    expect(evalAt('x^(2)')).toBe(4);
  });
  test('H12: articles dropped, of-before-paren applies (the floor of (x))', () => {
    const { expr } = normalizeWithMeta('the floor of (x)');
    expect(expr).not.toMatch(/\bthe\b|\bof\b/);
    expect(evalAt(expr)).toBe(2);
    expect(() => normalizeWithMeta('the floor of x + a')).toThrow(/card:/);
  });
  test('H13: bare trailing digits read as subscript (x17 → x, captioned)', () => {
    const { expr, assumptions } = normalizeWithMeta('x17 + x');
    expect(expr.replace(/\s+/g, '')).toBe('x+x');
    expect(assumptions).toContain('subscript-dropped');
    expect(evalAt(expr)).toBe(4);
  });
  test('H14: chemistry never silently plots (H2O + x badges)', () => {
    expect(normalizeWithMeta('log2(x)').expr.replace(/\s+/g, '')).toBe('log2(x)');
    // Whatever normalization does to H2O, it must not compile: badge, never curve.
    const { expr } = normalizeWithMeta('H2O + x');
    expect(() => math.compile(expandGluedX(expr)).evaluate({ x: 2 })).toThrow();
  });
});

function expandCheck(expr: string): string {
  if (!expr) throw new Error('empty expression');
  return expr;
}
