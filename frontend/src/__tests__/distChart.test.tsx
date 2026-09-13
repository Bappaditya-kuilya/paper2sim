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

import { DistChart } from '../components/sandbox/DistChart';

describe('DistChart', () => {
  test('renders gaussian distribution', () => {
    const { container } = render(<DistChart type="gaussian" />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders gaussian with custom mean and std', () => {
    const { container } = render(<DistChart type="gaussian" mean={5} std={2} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders binomial distribution', () => {
    const { container } = render(<DistChart type="binomial" trials={20} probability={0.5} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders poisson distribution', () => {
    const { container } = render(<DistChart type="poisson" lambda={5} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders uniform distribution', () => {
    const { container } = render(<DistChart type="uniform" />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders without variance shading', () => {
    const { container } = render(<DistChart type="gaussian" showVariance={false} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom bins', () => {
    const { container } = render(<DistChart type="gaussian" bins={50} />);
    expect(container.firstChild).toBeDefined();
  });
});
