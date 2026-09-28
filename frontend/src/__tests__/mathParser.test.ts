import { describe, test, expect } from 'vitest';
import { normalizeInput, stripLatex, addImplicitMultiply, classifyExpression, math, registerCustomFunctions } from '../lib/mathParser';

describe('stripLatex', () => {
  test('strips \\frac{a}{b} to (a)/(b)', () => {
    expect(stripLatex('\\frac{x}{y}')).toBe('(x)/(y)');
  });

  test('strips \\sqrt{x} to sqrt(x)', () => {
    expect(stripLatex('\\sqrt{x}')).toBe('sqrt(x)');
  });

  test('strips \\cdot to *', () => {
    expect(stripLatex('x \\cdot y')).toBe('x * y');
  });

  test('strips \\times to *', () => {
    expect(stripLatex('x \\times y')).toBe('x * y');
  });

  test('strips \\div to /', () => {
    expect(stripLatex('x \\div y')).toBe('x / y');
  });

  test('strips \\left( and \\right)', () => {
    expect(stripLatex('\\left(x\\right)')).toBe('(x)');
  });

  test('converts ^{exponent} to ^(exponent)', () => {
    expect(stripLatex('x^{2}')).toBe('x^(2)');
  });

  test('converts Greek letters', () => {
    expect(stripLatex('\\alpha + \\beta')).toBe('alpha + beta');
  });

  test('strips \\sin, \\cos, \\tan', () => {
    expect(stripLatex('\\sin(x) + \\cos(y)')).toBe('sin(x) + cos(y)');
  });

  test('handles complex LaTeX', () => {
    expect(stripLatex('\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}')).toBe('(-b + sqrt(b^(2) - 4ac))/(2a)');
  });

  test('unwraps $…$, \\(..\\) and \\[..\\] math delimiters', () => {
    expect(stripLatex('$y = x^2$')).toBe('y = x^(2)');
    expect(stripLatex('\\(y = x^2\\)')).toBe('y = x^(2)');
    expect(stripLatex('\\[y = x^2\\]')).toBe('y = x^(2)');
  });

  test('unwraps unknown typography macros but cards bare ones', () => {
    expect(stripLatex('$\\mathcal{F}(x) - \\ve{x}$')).toBe('F(x) - x');
    expect(() => stripLatex('\\dmodel^{-0.5}')).toThrow('card: unknown LaTeX command \\dmodel');
    expect(() => stripLatex('\\begin{bmatrix} 1 \\end{bmatrix}')).toThrow(/unknown LaTeX command/);
  });

  test('typography whitelist unwraps, semantic commands still card', () => {
    expect(stripLatex('\\boxed{E=mc^2}')).toBe('E=mc^(2)');
    expect(() => normalizeInput('\\boxed{E=mc^2}')).not.toThrow();
    expect(() => normalizeInput('\\mathrm{d}x = y \\, \\mathrm{d}t')).not.toThrow();
    expect(stripLatex('\\begin{align} y = x \\end{align}')).toBe('y = x');
    expect(() => stripLatex('lrate = \\dmodel{1}')).toThrow('card: unknown LaTeX command \\dmodel');
    expect(() => normalizeInput('lrate = \\dmodel{1}')).toThrow('card: unknown LaTeX command \\dmodel');
    expect(() => stripLatex('\\binom{2}{3}')).toThrow('card: unknown LaTeX command \\binom');
    expect(() => stripLatex('\\color{red}x')).toThrow('card: unknown LaTeX command \\color');
  });
});

describe('addImplicitMultiply', () => {
  test('adds * between digit and letter', () => {
    expect(addImplicitMultiply('2x')).toBe('2*x');
  });

  test('adds * between letter and parenthesis', () => {
    expect(addImplicitMultiply('x(y)')).toBe('x*(y)');
  });

  test('adds * between closing and opening parenthesis', () => {
    expect(addImplicitMultiply('(x)(y)')).toBe('(x)*(y)');
  });

  test('does not add * for function calls', () => {
    expect(addImplicitMultiply('sin(x)')).toBe('sin(x)');
  });

  test('does not add * for cos', () => {
    expect(addImplicitMultiply('cos(x)')).toBe('cos(x)');
  });

  test('adds * between number and parenthesis', () => {
    expect(addImplicitMultiply('2(x)')).toBe('2*(x)');
  });

  test('handles multiple implicit multiplies', () => {
    expect(addImplicitMultiply('2x(3)')).toBe('2*x*(3)');
  });
});

describe('normalizeInput', () => {
  test('normalizes plain text equation', () => {
    expect(normalizeInput('sin(x) + cos(y)')).toBe('sin(x) + cos(y)');
  });

  test('normalizes LaTeX equation', () => {
    expect(normalizeInput('y = mx + b')).toBe('mx + b');
  });

  test('normalizes f(x) notation', () => {
    expect(normalizeInput('f(x) = x^2')).toBe('x^(2)');
  });

  test('normalizes E = mc^2', () => {
    expect(normalizeInput('E = mc^2')).toBe('mc^(2)');
  });

  test('handles implicit multiplication', () => {
    expect(normalizeInput('2x')).toBe('2*x');
  });

  test('handles Greek letters in LaTeX', () => {
    expect(normalizeInput('\\alpha + \\beta')).toBe('alpha + beta');
  });

  test('handles word equations', () => {
    expect(normalizeInput('x plus y')).toBe('x + y');
  });

  test('handles word "times"', () => {
    expect(normalizeInput('2 times x')).toBe('2 * x');
  });

  test('handles "squared"', () => {
    expect(normalizeInput('x squared')).toBe('x^(2)');
  });

  test('handles LaTeX frac', () => {
    expect(normalizeInput('\\frac{x}{y}')).toBe('(x)/(y)');
  });

  test('normalizes $…$ and \\(..\\) wrapped equations like the bare form', () => {
    expect(normalizeInput('$y = x^2$')).toBe(normalizeInput('y = x^2'));
    expect(normalizeInput('\\(y = x^2\\)')).toBe(normalizeInput('y = x^2'));
    expect(normalizeInput('$y = x^2$')).toBe('x^(2)');
  });

  test('bare unknown macro cards with reason instead of shredding', () => {
    expect(() => normalizeInput('lrate = \\dmodel^{-0.5}')).toThrow('card: unknown LaTeX command \\dmodel');
  });
});

describe('classifyExpression', () => {
  test('classifies trigonometric', () => {
    expect(classifyExpression('sin(x)')).toBe('trigonometric');
    expect(classifyExpression('\\cos(x)')).toBe('trigonometric');
    expect(classifyExpression('tan(x)')).toBe('trigonometric');
  });

  test('classifies exponential', () => {
    expect(classifyExpression('e^x')).toBe('exponential');
  });

  test('classifies logarithmic', () => {
    expect(classifyExpression('log(x)')).toBe('logarithmic');
    expect(classifyExpression('\\ln(x)')).toBe('logarithmic');
  });

  test('classifies polynomial', () => {
    expect(classifyExpression('x^2 + 1')).toBe('polynomial');
  });

  test('classifies physics', () => {
    expect(classifyExpression('F = ma')).toBe('physics');
    expect(classifyExpression('E = mc^2')).toBe('physics');
  });

  test('classifies ODE', () => {
    expect(classifyExpression('dy/dx = y')).toBe('ode');
    expect(classifyExpression("y' = x")).toBe('ode');
  });

  test('classifies matrix', () => {
    expect(classifyExpression('\\begin{bmatrix} 1 & 0 \\\\ 0 & 1 \\end{bmatrix}')).toBe('matrix');
    expect(classifyExpression('matrix')).toBe('matrix');
  });

  test('classifies probability', () => {
    expect(classifyExpression('P(A)')).toBe('probability');
    expect(classifyExpression('probability of A')).toBe('probability');
  });

  test('classifies statistical', () => {
    expect(classifyExpression('mean(x)')).toBe('statistical');
    expect(classifyExpression('variance(x)')).toBe('statistical');
  });

  test('classifies calculus', () => {
    expect(classifyExpression('\\int x dx')).toBe('calculus');
    expect(classifyExpression('\\sum x_i')).toBe('calculus');
  });

  test('defaults to function', () => {
    expect(classifyExpression('x + y')).toBe('function');
  });
});

describe('registerCustomFunctions (idempotent)', () => {
  test('sigmoid(0)≈0.5 and relu(-1)===0 via shared math instance', () => {
    registerCustomFunctions();
    registerCustomFunctions();
    expect(Math.abs((math.evaluate('sigmoid(0)') as number) - 0.5)).toBeLessThan(1e-9);
    expect(math.evaluate('relu(-1)') as number).toBe(0);
  });
});
