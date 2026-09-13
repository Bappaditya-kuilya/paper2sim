import { describe, test, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-canvas">{children}</div>,
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Grid: () => null,
  AxesHelper: () => null,
}));

import { TrigSurface } from '../components/sandbox/TrigSurface';
import { PolySurface } from '../components/sandbox/PolySurface';
import { ExpSurface } from '../components/sandbox/ExpSurface';
import { LogSurface } from '../components/sandbox/LogSurface';

describe('TrigSurface', () => {
  test('renders with default props', () => {
    const { container } = render(<TrigSurface expression="sin(x)" />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom range', () => {
    const { container } = render(
      <TrigSurface expression="cos(y)" xRange={[-2, 2]} yRange={[-2, 2]} />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders with wireframe', () => {
    const { container } = render(
      <TrigSurface expression="sin(x)" wireframe />
    );
    expect(container.firstChild).toBeDefined();
  });
});

describe('PolySurface', () => {
  test('renders with coefficients', () => {
    const { container } = render(<PolySurface coefficients={[1, 2, 3]} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom range', () => {
    const { container } = render(
      <PolySurface coefficients={[0, 0, 1]} xRange={[-5, 5]} yRange={[-5, 5]} />
    );
    expect(container.firstChild).toBeDefined();
  });
});

describe('ExpSurface', () => {
  test('renders with default base', () => {
    const { container } = render(<ExpSurface />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom base', () => {
    const { container } = render(<ExpSurface base={2} />);
    expect(container.firstChild).toBeDefined();
  });
});

describe('LogSurface', () => {
  test('renders with default base', () => {
    const { container } = render(<LogSurface />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom base', () => {
    const { container } = render(<LogSurface base={10} />);
    expect(container.firstChild).toBeDefined();
  });
});
