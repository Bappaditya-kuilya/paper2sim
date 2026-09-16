import { describe, test, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Plot2D } from '../components/Plot2D';

describe('Plot2D pole gap', () => {
  test('1/(x-0.5) breaks across pole (≥2 subpaths, no spike)', () => {
    const { container } = render(
      <Plot2D equation={{ latex: 'y = 1/(x - 0.5)', type: 'function' }} />,
    );
    const d = container.querySelector('svg path')?.getAttribute('d') ?? '';
    expect((d.match(/M/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });
  test('sin(x) stays continuous (1 subpath)', () => {
    const { container } = render(
      <Plot2D equation={{ latex: 'y = sin(x)', type: 'trigonometric' }} />,
    );
    const d = container.querySelector('svg path')?.getAttribute('d') ?? '';
    expect((d.match(/M/g) ?? []).length).toBe(1);
  });
});
