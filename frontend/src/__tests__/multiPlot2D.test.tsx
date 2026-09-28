import { describe, test, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MultiPlot2D } from '../components/MultiPlot2D';
import { newRow } from '../lib/expressionRows';
import { unwrapEquationEnvs } from '../lib/mathParser';
import { DEFAULT_VIEWPORT } from '../lib/viewport';

function plotFor(latex: string) {
  render(<MultiPlot2D rows={[newRow(latex, '#FFFFFF')]} viewport={DEFAULT_VIEWPORT} />);
}

describe('MultiPlot2D extracted-equation shapes', () => {
  test.each([
    ['$y = x^2$'],
    ['\\(y = x^2\\)'],
    ['\\begin{equation} y = x^2 \\end{equation}'],
    ['\\begin{align} y = x^2 \\end{align}'],
    ['\\begin{align} y &= x^2 \\end{align}'],
    ['\\begin{gather} y = x^2 \\end{gather}'],
    ['y = \\sin(x)'],
  ])('%s renders a finite path', (latex) => {
    plotFor(latex);
    const plot = screen.getByRole('img', { name: '1 plot' });
    const d = plot.querySelector('path')?.getAttribute('d') ?? '';
    expect(d).toMatch(/^M-?[\d.]+,-?[\d.]+/);
    expect(d).not.toMatch(/NaN|Infinity/);
  });

  test('unknown macro row shows the card reason, not a bare empty panel', () => {
    plotFor('lrate = \\dmodel^{-0.5}');
    screen.getByRole('img', { name: 'No visible plots' });
    screen.getByText('card: unknown LaTeX command \\dmodel');
  });

  test('matrix rows stay off the 2D path silently', () => {
    plotFor('\\begin{bmatrix} 1 & 2 \\\\ 0 & 1 \\end{bmatrix}');
    screen.getByRole('img', { name: 'No visible plots' });
    expect(screen.queryByText(/unknown LaTeX command/)).toBeNull();
  });

  test('inequality rows stay on the region path', () => {
    plotFor('x^2 + y^2 <= 4');
    screen.getByRole('img', { name: 'No visible plots' });
    expect(screen.queryByText(/unknown LaTeX command/)).toBeNull();
  });

  test('multi-line align shows a parse reason, never vanishes silently', () => {
    plotFor('\\begin{align} y &= x^2 \\\\ y &= x \\end{align}');
    const panel = screen.getByRole('img', { name: 'No visible plots' });
    expect(panel.querySelectorAll('p').length).toBeGreaterThan(1);
  });

  test('y exploding mid-range still plots the visible portion with finite path data', () => {
    plotFor('y = e^(x^2)');
    const plot = screen.getByRole('img', { name: '1 plot' });
    const d = plot.querySelector('path')?.getAttribute('d') ?? '';
    expect(d).toMatch(/^M-?[\d.]+,-?[\d.]+/);
    expect(d).not.toMatch(/NaN|Infinity|e\+/);
    const nums = (d.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    let inside = 0;
    for (let i = 0; i + 1 < nums.length; i += 2) {
      if (nums[i] > 44 && nums[i] < 588 && nums[i + 1] > 12 && nums[i + 1] < 288) inside++;
    }
    expect(inside).toBeGreaterThan(10);
  });

  test('a failing row shows its reason while the good row still plots', () => {
    render(
      <MultiPlot2D
        rows={[newRow('lrate = \\dmodel^{-0.5}', '#00FF00'), newRow('y = x^2', '#FFFFFF')]}
        viewport={DEFAULT_VIEWPORT}
      />,
    );
    const plot = screen.getByRole('img', { name: '1 plot' });
    const d = plot.querySelector('path')?.getAttribute('d') ?? '';
    expect(d).toMatch(/^M-?[\d.]+,-?[\d.]+/);
    screen.getByText('card: unknown LaTeX command \\dmodel');
  });
});

describe('unwrapEquationEnvs', () => {
  test.each([
    ['\\begin{equation} y = x^2 \\end{equation}'],
    ['\\begin{equation*} y = x^2 \\end{equation*}'],
    ['\\begin{align} y &= x^2 \\end{align}'],
    ['\\begin{align*} y &= x^2 \\end{align*}'],
    ['\\begin{gather} y = x^2 \\end{gather}'],
    ['\\begin{gather*} y = x^2 \\end{gather*}'],
    ['\\begin{eqnarray} y &=& x^2 \\end{eqnarray}'],
    ['\\begin{eqnarray*} y &=& x^2 \\end{eqnarray*}'],
    ['\\begin{displaymath} y = x^2 \\end{displaymath}'],
    ['\\begin{equation}\\begin{aligned} y &= x^2 \\end{aligned}\\end{equation}'],
  ])('%s unwraps to a scalar body', (latex) => {
    expect(unwrapEquationEnvs(latex)).toMatch(/^\s*y\s*=\s*x\^2\s*$/);
  });

  test.each([
    ['\\begin{bmatrix} 1 & 2 \\\\ 0 & 1 \\end{bmatrix}'],
    ['\\begin{pmatrix} 1 & 2 \\\\ 0 & 1 \\end{pmatrix}'],
    ['\\begin{smallmatrix} 1 & 2 \\end{smallmatrix}'],
    ['\\begin{array}{cc} 1 & 2 \\end{array}'],
    ['\\begin{cases} x & x > 0 \\end{cases}'],
  ])('%s keeps its markers and tabs', (latex) => {
    expect(unwrapEquationEnvs(latex)).toBe(latex);
  });
});
