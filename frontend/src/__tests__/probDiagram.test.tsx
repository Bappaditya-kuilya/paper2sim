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

import { ProbDiagram, CalculatorDisplay } from '../components/sandbox/ProbDiagram';

describe('ProbDiagram', () => {
  test('renders with default props', () => {
    const { container } = render(<ProbDiagram />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom probabilities', () => {
    const { container } = render(
      <ProbDiagram pA={0.5} pB={0.6} pAandB={0.3} />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders with conditional probability', () => {
    const { container } = render(
      <ProbDiagram showConditional />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders with sliders', () => {
    const { container } = render(
      <ProbDiagram showSliders />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders without sliders', () => {
    const { container } = render(
      <ProbDiagram showSliders={false} />
    );
    expect(container.firstChild).toBeDefined();
  });
});

describe('CalculatorDisplay', () => {
  test('renders with default props', () => {
    const { container } = render(<CalculatorDisplay />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom expression', () => {
    const { container } = render(
      <CalculatorDisplay expression="sqrt(16)" result={4} />
    );
    expect(container.firstChild).toBeDefined();
  });

  test('renders with history', () => {
    const { container } = render(
      <CalculatorDisplay history={['2 + 2', '3 * 3', '4 / 2']} />
    );
    expect(container.firstChild).toBeDefined();
  });
});
