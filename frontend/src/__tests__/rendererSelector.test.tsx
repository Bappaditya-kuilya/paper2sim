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
});
