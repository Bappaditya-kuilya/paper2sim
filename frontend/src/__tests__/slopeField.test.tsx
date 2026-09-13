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

import { SlopeField } from '../components/sandbox/SlopeField';

describe('SlopeField', () => {
  test('renders with default expression', () => {
    const { container } = render(<SlopeField />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom expression', () => {
    const { container } = render(<SlopeField expression="x + y" />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom range', () => {
    const { container } = render(
      <SlopeField xRange={[-10, 10]} yRange={[-10, 10]} />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders with initial conditions', () => {
    const { container } = render(
      <SlopeField
        initialConditions={[
          { x: 0, y: 1, color: '#ef4444' },
          { x: 0, y: -1, color: '#3b82f6' },
        ]}
      />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom resolution', () => {
    const { container } = render(<SlopeField resolution={30} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with solution steps', () => {
    const { container } = render(
      <SlopeField
        initialConditions={[{ x: 0, y: 0 }]}
        solutionSteps={200}
      />
    );
    expect(container.firstChild).toBeDefined();
  });
});
