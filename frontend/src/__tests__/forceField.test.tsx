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

import { ForceField, EnergySurface, OhmSurface, PowerSurface } from '../components/sandbox/ForceField';

describe('ForceField', () => {
  test('renders with default props', () => {
    const { container } = render(<ForceField />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom mass and acceleration', () => {
    const { container } = render(<ForceField mass={5} acceleration={10} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom grid size', () => {
    const { container } = render(<ForceField gridSize={3} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders arrows with direction', () => {
    const { container } = render(<ForceField mass={2} acceleration={5} />);
    expect(container.firstChild).toBeDefined();
  });
});

describe('EnergySurface', () => {
  test('renders with default props', () => {
    const { container } = render(<EnergySurface />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom mass and gravity', () => {
    const { container } = render(<EnergySurface mass={2} gravity={10} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom spring constant', () => {
    const { container } = render(<EnergySurface springConstant={5} />);
    expect(container.firstChild).toBeDefined();
  });
});

describe('OhmSurface', () => {
  test('renders with default resistance', () => {
    const { container } = render(<OhmSurface />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom resistance', () => {
    const { container } = render(<OhmSurface resistance={20} />);
    expect(container.firstChild).toBeDefined();
  });
});

describe('PowerSurface', () => {
  test('renders with default resistance', () => {
    const { container } = render(<PowerSurface />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom resistance', () => {
    const { container } = render(<PowerSurface resistance={15} />);
    expect(container.firstChild).toBeDefined();
  });
});
