import { describe, test, expect, vi } from 'vitest';
import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { Plot2D } from '../components/Plot2D';
import { Viewer3D } from '../components/Viewer3D';
import {
  ParamPanel,
} from '../components/ParamPanel';
import {
  DEFAULT_VIEWER_PARAMS,
  type ParamPatch,
  type ViewerParams,
} from '../lib/viewerParams';
import App from '../App';
import { defaultFreeParams, expandGluedX, showDimensionToggle } from '../lib/plotMeta';
import { math, normalizeInput } from '../lib/mathParser';
import { apiBase, extractText } from '../lib/extractApi';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-canvas">{children}</div>,
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Grid: () => null,
}));

vi.mock('../lib/extractApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/extractApi')>();
  return {
    ...actual,
    checkBackend: vi.fn().mockResolvedValue(false),
    extractText: vi.fn(),
  };
});

function Harness() {
  const [params, setParams] = useState<ViewerParams>(DEFAULT_VIEWER_PARAMS);
  const patch = (p: ParamPatch) => setParams((prev) => ({ ...prev, ...p }));
  return (
    <div>
      <Viewer3D latex="sin(x) + cos(y)" {...params} />
      <ParamPanel {...params} onChange={patch} />
    </div>
  );
}

describe('Plot2D (2D cases)', () => {
  test('function renders an SVG path', () => {
    const { container } = render(<Plot2D equation={{ latex: 'y = sin(x)', type: 'trigonometric' }} />);
    expect(container.querySelector('svg path')).not.toBeNull();
  });

  test('matrix renders a table', () => {
    const { container } = render(
      <Plot2D equation={{ latex: '\\begin{bmatrix}1 & 2 \\\\ 3 & 4\\end{bmatrix}', type: 'matrix' }} />,
    );
    expect(container.querySelector('table')).not.toBeNull();
  });

  test('unknown renders info card', () => {
    render(<Plot2D equation={{ latex: 'E = mc^2', type: 'unknown' }} />);
    expect(screen.getByText('No 2D plot for this type')).toBeDefined();
    expect(screen.getByText('E = mc^2')).toBeDefined();
  });

  test('equation with plottable x-side renders an SVG path', () => {
    const { container } = render(<Plot2D equation={{ latex: 'y = mx + c', type: 'equation' }} />);
    expect(container.querySelector('svg path')).not.toBeNull();
  });

  test('Box = 5 renders info card, no path', () => {
    const { container } = render(<Plot2D equation={{ latex: 'Box = 5', type: 'equation' }} />);
    expect(container.querySelector('svg path')).toBeNull();
    expect(screen.getByText('No 2D plot for this type')).toBeDefined();
  });

  test('garbage input renders raw text + badge, app stays up', () => {
    const { container } = render(<Plot2D equation={{ latex: 'sin(((', type: 'trigonometric' }} />);
    expect(screen.getByText('sin(((')).toBeDefined();
    expect(screen.getByText('not plottable')).toBeDefined();
    expect(container.querySelector('[role="img"]')).not.toBeNull();
  });
});

describe('Viewer 3D toggle', () => {
  test('toggle mounts viewer for function type, 2D default', () => {
    const { container } = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Use sample' }));
    expect(screen.getByRole('radiogroup', { name: 'Plot dimension' })).toBeDefined();
    expect(container.querySelector('svg')).not.toBeNull();
    expect(screen.queryByTestId('viewer-3d')).toBeNull();
    fireEvent.click(screen.getByRole('radio', { name: '3D' }));
    expect(screen.getByTestId('viewer-3d')).toBeDefined();
    expect(screen.getByTestId('mock-canvas')).toBeDefined();
  });

  test('no toggle for unknown type', async () => {
    vi.mocked(extractText).mockResolvedValue({
      equations: [{ latex: 'E = mc^2', type: 'unknown' }],
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: 'E = mc^2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    await screen.findByText('No 2D plot for this type');
    expect(screen.queryByRole('radiogroup', { name: 'Plot dimension' })).toBeNull();
    expect(screen.queryByTestId('viewer-3d')).toBeNull();
  });

  test('toggle appears for equation with plottable x-side', async () => {
    vi.mocked(extractText).mockResolvedValue({
      equations: [{ latex: 'y = mx + c', type: 'equation' }],
    });
    const { container } = render(<App />);
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: 'y = mx + c' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    await screen.findByRole('radiogroup', { name: 'Plot dimension' });
    expect(container.querySelector('svg path')).not.toBeNull();
    expect(container.querySelector('[aria-label="3D capable"]')).not.toBeNull();
  });

  test('E = mc^2 as equation stays info-card, no toggle', async () => {
    vi.mocked(extractText).mockResolvedValue({
      equations: [{ latex: 'E = mc^2', type: 'equation' }],
    });
    const { container } = render(<App />);
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: 'E = mc^2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    await screen.findByText('No 2D plot for this type');
    expect(screen.queryByRole('radiogroup', { name: 'Plot dimension' })).toBeNull();
    expect(container.querySelector('[aria-label="3D capable"]')).toBeNull();
  });

  test('Box = 5 does not plot, no toggle', async () => {
    vi.mocked(extractText).mockResolvedValue({
      equations: [{ latex: 'Box = 5', type: 'equation' }],
    });
    const { container } = render(<App />);
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: 'Box = 5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    await screen.findByText('No 2D plot for this type');
    expect(container.querySelector('svg')).toBeNull();
    expect(screen.queryByRole('radiogroup', { name: 'Plot dimension' })).toBeNull();
  });

  test('resolution 200 forced to ≤96', () => {
    render(<Harness />);
    const res = screen.getByLabelText('Resolution') as HTMLInputElement;
    fireEvent.change(res, { target: { value: '200' } });
    expect(res.value).toBe('96');
    expect(screen.getByTestId('mock-canvas')).toBeDefined();
  });

  test('invalid range (min≥max) keeps last-valid render', () => {
    render(<Harness />);
    const xmin = screen.getByLabelText('X min') as HTMLInputElement;
    fireEvent.change(xmin, { target: { value: '20' } });
    expect(screen.getByText(/keeping last valid range/)).toBeDefined();
    expect(xmin.className).toMatch('border-red-500');
    expect(screen.getByTestId('mock-canvas')).toBeDefined();
  });
});

describe('defaultFreeParams (2D/3D agreement)', () => {
  test('standalone params default to 1', () => {
    expect(defaultFreeParams('sin(k*x)+a')).toBe('sin((1)*x)+(1)');
  });

  test('axes x/y untouched, constants and function names untouched', () => {
    expect(defaultFreeParams('sin(x)+cos(y)+e+pi+sqrt((1))')).toBe('sin(x)+cos(y)+e+pi+sqrt((1))');
  });

  test('glued forms expand identically for both renderers', () => {
    expect(expandGluedX('mx + c')).toBe('m*x + c');
    expect(expandGluedX('2x+1')).toBe('2*x+1');
    expect(expandGluedX('sin(x)+max(a,b)+alpha+x2')).toBe('sin(x)+max(a,b)+alpha+x2');
  });

  test('ln(x) maps to log(x) (bundle has no ln)', () => {
    expect(normalizeInput('y = ln(x)')).toBe('log(x)');
    const v: unknown = math.compile(expandGluedX(normalizeInput('y = ln(x)'))).evaluate({ x: Math.E });
    expect(Math.abs((v as number) - 1)).toBeLessThan(1e-9);
  });

  test('apiBase strips trailing slash (no double-slash URLs)', async () => {
    vi.stubEnv('VITE_API_URL', 'http://api.test/');
    expect(apiBase()).toBe('http://api.test');
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ equations: [] }), { status: 200 })),
    );
    vi.stubGlobal('fetch', fetchMock);
    const { extractText: realExtract } = await vi.importActual<typeof import('../lib/extractApi')>('../lib/extractApi');
    await realExtract('y=x');
    expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/extract');
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });
});

describe('extractApi timeout + bad response', () => {
  test('TimeoutError maps to Request timed out', async () => {
    const { extractText: realExtract } = await vi.importActual<typeof import('../lib/extractApi')>('../lib/extractApi');
    const timeoutErr = new DOMException('The operation timed out', 'TimeoutError');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(timeoutErr));
    await expect(realExtract('y=x')).rejects.toThrow('Request timed out');
    vi.unstubAllGlobals();
  });

  test('200-with-HTML maps to Bad response from server', async () => {
    const { extractText: realExtract } = await vi.importActual<typeof import('../lib/extractApi')>('../lib/extractApi');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>oops</html>', { status: 200 })));
    await expect(realExtract('y=x')).rejects.toThrow('Bad response from server');
    vi.unstubAllGlobals();
  });

  test('fetch uses 30s AbortSignal.timeout', async () => {
    const { extractText: realExtract } = await vi.importActual<typeof import('../lib/extractApi')>('../lib/extractApi');
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ equations: [] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await realExtract('y=x');
    const signal = fetchMock.mock.calls[0][1]?.signal as AbortSignal | undefined;
    expect(signal instanceof AbortSignal).toBe(true);
    vi.unstubAllGlobals();
  });
});

describe('showDimensionToggle gate', () => {
  test('matrix [[x,2],[3,4]] shows no toggle', async () => {
    expect(showDimensionToggle('matrix', '[[x,2],[3,4]]')).toBe(false);
    vi.mocked(extractText).mockResolvedValue({
      equations: [{ latex: '[[x,2],[3,4]]', type: 'matrix' }],
    });
    const { container } = render(<App />);
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: '[[x,2],[3,4]]' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    await screen.findAllByText('[[x,2],[3,4]]');
    expect(screen.queryByRole('radiogroup', { name: 'Plot dimension' })).toBeNull();
    expect(container.querySelector('[aria-label="3D capable"]')).toBeNull();
  });
});
