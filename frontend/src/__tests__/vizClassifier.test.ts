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

  test('dy/dx = x + y ode → 3d (SlopeField canvas)', () => {
    expect(classifyVizMode('dy/dx = x + y', 'ode')).toBe('3d');
  });

  test('E = mc^2 physics → 3d (ForceField canvas)', () => {
    expect(classifyVizMode('E = mc^2', 'physics')).toBe('3d');
  });

  test('matrix A matrix → 3d (MatrixVis canvas)', () => {
    expect(classifyVizMode('matrix A', 'matrix')).toBe('3d');
  });

  test('P(A|B) probability → 3d (ProbDiagram canvas)', () => {
    expect(classifyVizMode('P(A|B)', 'probability')).toBe('3d');
  });

  test('mean(x) statistical → 3d (DistChart canvas)', () => {
    expect(classifyVizMode('mean(x)', 'statistical')).toBe('3d');
  });

  test('sinh(x) hyperbolic single-var → 3d (GenericSurface canvas)', () => {
    expect(classifyVizMode('sinh(x)', 'hyperbolic')).toBe('3d');
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
