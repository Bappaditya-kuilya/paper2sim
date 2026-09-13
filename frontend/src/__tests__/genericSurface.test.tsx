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

import { GenericSurface, ParametricSurface } from '../components/sandbox/GenericSurface';

describe('GenericSurface', () => {
  test('renders with valid expression', () => {
    const { container } = render(<GenericSurface expression="x^2 + y^2" />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom range', () => {
    const { container } = render(
      <GenericSurface expression="sin(x) * cos(y)" xRange={[-3, 3]} yRange={[-3, 3]} />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders with wireframe', () => {
    const { container } = render(
      <GenericSurface expression="x + y" wireframe />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('handles invalid expression gracefully', () => {
    const { container } = render(<GenericSurface expression="invalid!!!" />);
    expect(container.firstChild).toBeDefined();
  });
});

describe('ParametricSurface', () => {
  test('renders sphere', () => {
    const { container } = render(
      <ParametricSurface
        expressionX="sin(u) * sin(v)"
        expressionY="cos(u) * sin(v)"
        expressionZ="cos(v)"
      />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders torus', () => {
    const { container } = render(
      <ParametricSurface
        expressionX="(2 + cos(v)) * cos(u)"
        expressionY="(2 + cos(v)) * sin(u)"
        expressionZ="sin(v)"
        uRange={[0, Math.PI * 2]}
        vRange={[0, Math.PI * 2]}
      />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('handles invalid expression gracefully', () => {
    const { container } = render(
      <ParametricSurface
        expressionX="bad!!!"
        expressionY="y"
        expressionZ="z"
      />
    );
    expect(container.firstChild).toBeDefined();
  });
});
