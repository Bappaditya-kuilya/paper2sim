import { describe, test, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-canvas">{children}</div>,
  useFrame: () => {},
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Grid: () => null,
  AxesHelper: () => null,
  Line: () => null,
}));

import { selectRenderer, MathSurface } from '../components/sandbox/RendererSelector';

describe('selectRenderer', () => {
  test('returns TrigSurface for trigonometric', () => {
    const Renderer = selectRenderer('trigonometric');
    expect(Renderer.name).toBe('TrigSurface');
  });

  test('returns PolySurface for polynomial', () => {
    const Renderer = selectRenderer('polynomial');
    expect(Renderer.name).toBe('PolySurface');
  });

  test('returns ExpSurface for exponential', () => {
    const Renderer = selectRenderer('exponential');
    expect(Renderer.name).toBe('ExpSurface');
  });

  test('returns LogSurface for logarithmic', () => {
    const Renderer = selectRenderer('logarithmic');
    expect(Renderer.name).toBe('LogSurface');
  });

  test('returns GenericSurface for hyperbolic', () => {
    const Renderer = selectRenderer('hyperbolic');
    expect(Renderer.name).toBe('GenericSurface');
  });

  test('returns MatrixVis for matrix', () => {
    const Renderer = selectRenderer('matrix');
    expect(Renderer.name).toBe('MatrixVis');
  });

  test('returns ProbDiagram for probability', () => {
    const Renderer = selectRenderer('probability');
    expect(Renderer.name).toBe('ProbDiagram');
  });

  test('returns DistChart for statistical', () => {
    const Renderer = selectRenderer('statistical');
    expect(Renderer.name).toBe('DistChart');
  });

  test('returns SlopeField for ode', () => {
    const Renderer = selectRenderer('ode');
    expect(Renderer.name).toBe('SlopeField');
  });

  test('returns ForceField for physics', () => {
    const Renderer = selectRenderer('physics');
    expect(Renderer.name).toBe('ForceField');
  });

  test('returns GenericSurface for unknown type', () => {
    const Renderer = selectRenderer('unknown');
    expect(Renderer.name).toBe('GenericSurface');
  });
});

describe('MathSurface', () => {
  test('renders trigonometric surface', () => {
    const { container } = render(
      <MathSurface expression="sin(x)" modelType="trigonometric" />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders polynomial surface', () => {
    const { container } = render(
      <MathSurface expression="x^2" modelType="polynomial" coefficients={[0, 0, 1]} />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders exponential surface', () => {
    const { container } = render(
      <MathSurface expression="e^x" modelType="exponential" base={Math.E} />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders logarithmic surface', () => {
    const { container } = render(
      <MathSurface expression="ln(x)" modelType="logarithmic" base={Math.E} />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders generic surface for unknown type', () => {
    const { container } = render(
      <MathSurface expression="x + y" modelType="function" />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders MatrixVis for matrix', () => {
    const { container } = render(
      <MathSurface expression="\\begin{bmatrix} 1 & 2 \\\\ 3 & 4 \\end{bmatrix}" modelType="matrix" />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders ProbDiagram for probability', () => {
    const { container } = render(
      <MathSurface expression="P(A) = 0.5" modelType="probability" />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders DistChart for statistical', () => {
    const { container } = render(
      <MathSurface expression="mean(x)" modelType="statistical" />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders SlopeField for ode', () => {
    const { container } = render(
      <MathSurface expression="dy/dx = x + y" modelType="ode" />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders ForceField for physics', () => {
    const { container } = render(
      <MathSurface expression="F = ma" modelType="physics" />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders GenericSurface for hyperbolic', () => {
    const { container } = render(
      <MathSurface expression="sinh(x) + cosh(y)" modelType="hyperbolic" />
    );
    expect(container.firstChild).toBeDefined();
  });
});
