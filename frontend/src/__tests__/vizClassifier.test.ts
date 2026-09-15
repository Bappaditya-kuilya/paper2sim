import { describe, test, expect } from 'vitest';
import { classifyVizMode } from '../lib/vizClassifier';

describe('classifyVizMode', () => {
  test('sin(x+y) trigonometric → 3d', () => {
    expect(classifyVizMode('sin(x+y)', 'trigonometric')).toBe('3d');
  });

  test('sin(x) trigonometric → info (single variable)', () => {
    expect(classifyVizMode('sin(x)', 'trigonometric')).toBe('info');
  });

  test('x^2 + y^2 polynomial → 3d', () => {
    expect(classifyVizMode('x^2 + y^2', 'polynomial')).toBe('3d');
  });

  test('x^2 + 1 polynomial → info', () => {
    expect(classifyVizMode('x^2 + 1', 'polynomial')).toBe('info');
  });

  test('e^(x+y) exponential → 3d', () => {
    expect(classifyVizMode('e^(x+y)', 'exponential')).toBe('3d');
  });

  test('log(x*y) logarithmic → 3d', () => {
    expect(classifyVizMode('log(x*y)', 'logarithmic')).toBe('3d');
  });

  test('sinh(x+t) hyperbolic → 3d', () => {
    expect(classifyVizMode('sinh(x+t)', 'hyperbolic')).toBe('3d');
  });

  test('dy/dx = x + y ode → info', () => {
    expect(classifyVizMode('dy/dx = x + y', 'ode')).toBe('info');
  });

  test('E = mc^2 physics → info', () => {
    expect(classifyVizMode('E = mc^2', 'physics')).toBe('info');
  });

  test('matrix A matrix → info', () => {
    expect(classifyVizMode('matrix A', 'matrix')).toBe('info');
  });

  test('P(A|B) probability → info', () => {
    expect(classifyVizMode('P(A|B)', 'probability')).toBe('info');
  });

  test('mean(x) statistical → info', () => {
    expect(classifyVizMode('mean(x)', 'statistical')).toBe('info');
  });

  test('\\int f(x)dx calculus → info', () => {
    expect(classifyVizMode('\\int f(x)dx', 'calculus')).toBe('info');
  });

  test('f(x,y) = x*y function → 3d', () => {
    expect(classifyVizMode('f(x,y) = x*y', 'function')).toBe('3d');
  });

  test('f(x) = x^2 function → info', () => {
    expect(classifyVizMode('f(x) = x^2', 'function')).toBe('info');
  });
});
