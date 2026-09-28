import { describe, test, expect, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import App from '../App';
import { extractText } from '../lib/extractApi';

vi.mock('../lib/extractApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/extractApi')>();
  return {
    ...actual,
    checkBackend: vi.fn().mockResolvedValue(false),
    extractText: vi.fn(),
  };
});

// Never-resolving chunk: the lazy Viewer3D import never settles, so the
// Suspense fallback is what renders — deterministic, no network, no timers.
vi.mock('../components/Viewer3D', () => new Promise(() => {}));

describe('App status line', () => {
  test('pluralizes the equation count', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Use sample' }));
    expect(await screen.findByText('2 equations — Sample')).toBeDefined();

    vi.mocked(extractText).mockResolvedValue({ equations: [{ latex: 'y = x', type: 'function' }] });
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: 'y=x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    expect(await screen.findByText('1 equation — Pasted equation')).toBeDefined();
  });
});

describe('App inline edit type refresh', () => {
  test('editing a row re-derives its type badge and hint', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Use sample' }));
    let section = await screen.findByRole('region', { name: 'Selected equation' });
    expect(within(section).getByText('trigonometric')).toBeDefined();
    expect(within(section).getByText('raise k to pack waves tighter')).toBeDefined();

    const input = screen.getAllByRole('textbox', { name: 'Equation' })[0] as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'y < (x - 15)' } });
    fireEvent.blur(input);

    section = screen.getByRole('region', { name: 'Selected equation' });
    expect(within(section).queryByText('trigonometric')).toBeNull();
    expect(within(section).getByText('function')).toBeDefined();
    expect(within(section).queryByText('raise k to pack waves tighter')).toBeNull();
    expect(within(section).getByText('change a number to shift the curve')).toBeDefined();
  });
});

describe('App 3D Suspense fallback', () => {
  test('role="status" Loading 3D… shows while the lazy chunk is unresolved', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Use sample' }));
    fireEvent.click(screen.getByRole('radio', { name: '3D' }));
    const fallback = await screen.findByText('Loading 3D…');
    expect(fallback).toHaveAttribute('role', 'status');
    expect(screen.queryByTestId('viewer-3d')).toBeNull();
  });
});
