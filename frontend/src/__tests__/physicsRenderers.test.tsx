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

import {
  SpringForce,
  GravitationalForce,
  CoulombForce,
  IdealGas,
} from '../components/sandbox/PhysicsRenderers';

describe('SpringForce', () => {
  test('renders with default props', () => {
    const { container } = render(<SpringForce />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom spring constant', () => {
    const { container } = render(<SpringForce springConstant={10} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom damping', () => {
    const { container } = render(<SpringForce damping={0.2} />);
    expect(container.firstChild).toBeDefined();
  });
});

describe('GravitationalForce', () => {
  test('renders with default props', () => {
    const { container } = render(<GravitationalForce />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom masses', () => {
    const { container } = render(<GravitationalForce mass1={20} mass2={10} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom distance', () => {
    const { container } = render(<GravitationalForce distance={5} />);
    expect(container.firstChild).toBeDefined();
  });
});

describe('CoulombForce', () => {
  test('renders with opposite charges', () => {
    const { container } = render(<CoulombForce charge1={1} charge2={-1} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with like charges', () => {
    const { container } = render(<CoulombForce charge1={1} charge2={1} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom distance', () => {
    const { container } = render(<CoulombForce distance={3} />);
    expect(container.firstChild).toBeDefined();
  });
});

describe('IdealGas', () => {
  test('renders with default props', () => {
    const { container } = render(<IdealGas />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom temperature', () => {
    const { container } = render(<IdealGas temperature={500} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom volume', () => {
    const { container } = render(<IdealGas volume={2} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom particle count', () => {
    const { container } = render(<IdealGas particleCount={100} />);
    expect(container.firstChild).toBeDefined();
  });
});
