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

import { MatrixVis } from '../components/sandbox/MatrixVis';

describe('MatrixVis', () => {
  test('renders with default matrix', () => {
    const { container } = render(<MatrixVis />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom matrix', () => {
    const { container } = render(
      <MatrixVis matrix={[[1, 2], [3, 4]]} />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders with dot product', () => {
    const { container } = render(
      <MatrixVis
        matrix={[[1, 2, 3], [4, 5, 6]]}
        showDotProduct
        vector={[1, 0, 1]}
      />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders with edit handler', () => {
    const onEdit = vi.fn();
    const { container } = render(<MatrixVis onEdit={onEdit} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with negative values', () => {
    const { container } = render(
      <MatrixVis matrix={[[-1, 2], [3, -4]]} />
    );
    expect(container.firstChild).toBeDefined();
  });
});
