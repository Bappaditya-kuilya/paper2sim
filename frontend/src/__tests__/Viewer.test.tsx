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
    await screen.findByDisplayValue('E = mc^2');
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
  });

  test('E = mc^2 as equation shows detail, no toggle', async () => {
    vi.mocked(extractText).mockResolvedValue({
      equations: [{ latex: 'E = mc^2', type: 'equation' }],
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: 'E = mc^2' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    await screen.findByDisplayValue('E = mc^2');
    expect(screen.queryByRole('radiogroup', { name: 'Plot dimension' })).toBeNull();
    expect(screen.queryByTestId('viewer-3d')).toBeNull();
  });

  test('Box = 5 shows detail, no toggle', async () => {
    vi.mocked(extractText).mockResolvedValue({
      equations: [{ latex: 'Box = 5', type: 'equation' }],
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: 'Box = 5' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    await screen.findByDisplayValue('Box = 5');
    expect(screen.queryByRole('radiogroup', { name: 'Plot dimension' })).toBeNull();
    expect(screen.queryByTestId('viewer-3d')).toBeNull();
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

describe('N1 + captions + fallback reasons (plan-math §3-§4)', () => {
  test('subscript-dropped input shows caption', () => {
    render(<Plot2D equation={{ latex: 'y = x_{1} + x', type: 'function' }} />);
    expect(screen.getByText('Showing x — subscript dropped for 2D.')).toBeDefined();
  });

  test('clean y=sin(x) shows no caption', () => {
    render(<Plot2D equation={{ latex: 'y=sin(x)', type: 'trigonometric' }} />);
    expect(screen.queryByText(/Showing /)).toBeNull();
  });

  test('d/dx without derivativeDependencies cards, never plots', () => {
    const { container } = render(<Plot2D equation={{ latex: 'd/dx x^2', type: 'calculus' }} />);
    expect(container.querySelector('svg path')).toBeNull();
    expect(screen.getByText('No 2D plot for this type')).toBeDefined();
    expect(screen.getByText('d/dx x^2')).toBeDefined();
  });

  test('garbage shows stage reason line', () => {
    render(<Plot2D equation={{ latex: 'sin(((', type: 'trigonometric' }} />);
    expect(screen.getByText(/empty expression|no finite points on x∈\[-10,10\]/)).toBeDefined();
  });
});

describe('F4 PlotErrorBoundary', () => {
  test('boundary catches throwing child showing badge+raw+Retry', async () => {
    const { PlotErrorBoundary } = await import('../App');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const Thrower = () => {
        throw new Error('boom');
      };
      render(
        <PlotErrorBoundary paper="T" index={0} type="function" latex="y=x">
          <Thrower />
        </PlotErrorBoundary>,
      );
      expect(screen.getByText('Plot failed')).toBeDefined();
      expect(screen.getByText('y=x')).toBeDefined();
      expect(screen.getByRole('button', { name: 'Retry plot' })).toBeDefined();
      expect(errSpy).toHaveBeenCalled();
      const logged = JSON.stringify(errSpy.mock.calls);
      expect(logged).toMatch('T');
    } finally {
      errSpy.mockRestore();
    }
  });

  test('Retry remounts same selection', async () => {
    const { PlotErrorBoundary } = await import('../App');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      let shouldThrow = true;
      const Flaky = () => {
        if (shouldThrow) throw new Error('first boom');
        return <div>recovered</div>;
      };
      render(
        <PlotErrorBoundary paper="T" index={1} type="function" latex="y=x+1">
          <Flaky />
        </PlotErrorBoundary>,
      );
      expect(screen.getByText('Plot failed')).toBeDefined();
      shouldThrow = false;
      fireEvent.click(screen.getByRole('button', { name: 'Retry plot' }));
      expect(screen.getByText('recovered')).toBeDefined();
    } finally {
      errSpy.mockRestore();
    }
  });

  test('2nd consecutive failure disables Retry in place', async () => {
    const { PlotErrorBoundary } = await import('../App');
    const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const AlwaysThrow = () => {
        throw new Error('always');
      };
      render(
        <PlotErrorBoundary paper="T" index={2} type="function" latex="y=x+2">
          <AlwaysThrow />
        </PlotErrorBoundary>,
      );
      const btn1 = screen.getByRole('button', { name: 'Retry plot' }) as HTMLButtonElement;
      expect(btn1.disabled).toBe(false);
      fireEvent.click(btn1);
      const btn2 = screen.getByRole('button', { name: 'Retry plot' }) as HTMLButtonElement;
      expect(btn2.disabled).toBe(true);
    } finally {
      errSpy.mockRestore();
    }
  });
});

describe('F3 caps', () => {
  test('list header shows backend warning verbatim', async () => {
    vi.mocked(extractText).mockResolvedValue({
      equations: [{ latex: 'y=x', type: 'function' }],
      warning: 'Showing first 200 of 250',
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: 'y=x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    await screen.findByText('Showing first 200 of 250');
  });

  test('matrix bail card on huge grid', () => {
    const cols = Array.from({ length: 101 }, () => '1').join(' & ');
    const body = Array.from({ length: 101 }, () => cols).join(' \\\\ ');
    const latex = `\\begin{bmatrix}${body}\\end{bmatrix}`;
    const { container } = render(<Plot2D equation={{ latex, type: 'matrix' }} />);
    expect(container.querySelector('table')).toBeNull();
    expect(screen.getByText('Matrix too large to render')).toBeDefined();
  });
});

describe('F5 Viewer3D CARD', () => {
  test('CARD input renders info card instead of throwing', () => {
    const cardLatex = '\\sum_{i=1}^{n} x';
    render(
      <Viewer3D
        latex={cardLatex}
        xRange={[-10, 10]}
        yRange={[-10, 10]}
        resolution={32}
        showGrid
        showAxes
        wireframe={false}
      />,
    );
    expect(screen.getByText('No 3D view for this type')).toBeDefined();
    expect(screen.getByText(cardLatex)).toBeDefined();
  });
});

describe('zero-state abstract fallback', () => {
  test('empty result with abstract warning shows no-full-text subline', async () => {
    vi.mocked(extractText).mockResolvedValue({
      equations: [],
      warning: 'full text unavailable, using abstract only',
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: 'y=x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    await screen.findByText('No equations found');
    expect(screen.getByText('No full text for this paper — its abstract had no plottable math.')).toBeDefined();
  });

  test('empty result with other cause keeps default fallback', async () => {
    vi.mocked(extractText).mockResolvedValue({
      equations: [],
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: 'y=x' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    await screen.findByText('No equations found');
    expect(screen.getByText('No extractable math detected in that input.')).toBeDefined();
  });
});

describe('R1 RegionPlot (plan-universal v2 §1 R1)', () => {
  test('region renders canvas for x²+y²≤4 + mandatory caption', () => {
    const { container } = render(<Plot2D equation={{ latex: 'x^2+y^2<=4', type: 'equation' }} />);
    expect(container.querySelector('canvas')).not.toBeNull();
    expect(screen.getByText('shaded = true over visible domain')).toBeDefined();
  });

  test('degenerate empty cards with exact string', () => {
    const { container } = render(<Plot2D equation={{ latex: 'x^2+y^2<=-1', type: 'equation' }} />);
    expect(container.querySelector('canvas')).toBeNull();
    expect(screen.getByText('no true cells on x∈[-10,10] y∈[-10,10]')).toBeDefined();
  });

  test('degenerate full cards with exact string', () => {
    const { container } = render(<Plot2D equation={{ latex: 'x^2+y^2>=-1', type: 'equation' }} />);
    expect(container.querySelector('canvas')).toBeNull();
    expect(screen.getByText('true everywhere on visible domain — widen range to see boundary')).toBeDefined();
  });
});

describe('R2 inspect tiers (plan-universal v2 §1 R2)', () => {
  test('DEFINITION badge + Plot one side sets evaluator', () => {
    const { container } = render(<Plot2D equation={{ latex: 'E = 5', type: 'unknown' }} />);
    expect(screen.getByText('DEFINITION')).toBeDefined();
    fireEvent.click(screen.getByRole('button', { name: 'Plot one side' }));
    expect(container.querySelector('svg path')).not.toBeNull();
  });

  test('Edit into y=… copies draft without eval', () => {
    const { container } = render(<Plot2D equation={{ latex: 'E = 5', type: 'unknown' }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Edit into y=…' }));
    const draft = screen.getByLabelText('Draft input') as HTMLInputElement;
    expect(draft.value).toBe('y=5');
    expect(container.querySelector('svg path')).toBeNull();
  });
});

describe('R3 jump (plan-universal v2 §1 R3)', () => {
  test('recenter button recenters domain on C', async () => {
    vi.mocked(extractText).mockResolvedValue({
      equations: [{ latex: '(x-100)^2 + y^2 <= 4', type: 'equation' }],
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: '(x-100)^2 + y^2 <= 4' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    const btn = await screen.findByRole('button', { name: 'Recenter on x=100' });
    expect(btn).toBeDefined();
    fireEvent.click(btn);
    expect(await screen.findByText(/x∈\[90,110\]/)).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Recenter on x=100' })).toBeNull();
  });
});

describe('echo contract (plan-universal v2 §2)', () => {
  test('silent on clean region input', () => {
    render(<Plot2D equation={{ latex: 'x^2+y^2<=4', type: 'equation' }} />);
    expect(screen.queryByText(/normalized:/)).toBeNull();
  });
});

describe('multi-overlay shell (new)', () => {
  test('3 rows overlay (3 paths)', async () => {
    vi.mocked(extractText).mockResolvedValue({
      equations: [
        { latex: 'y = sin(x)', type: 'trigonometric' },
        { latex: 'y = x^2', type: 'polynomial' },
        { latex: 'y = x', type: 'function' },
      ],
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: 'y=sin(x)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    await screen.findAllByLabelText('Equation');
    const plots = () => screen.getByRole('img', { name: /\d+ plots?/ });
    expect(plots().querySelectorAll('path').length).toBe(3);
  });

  test('eye toggle hides path', async () => {
    vi.mocked(extractText).mockResolvedValue({
      equations: [
        { latex: 'y = sin(x)', type: 'trigonometric' },
        { latex: 'y = x^2', type: 'polynomial' },
        { latex: 'y = x', type: 'function' },
      ],
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: 'y=sin(x)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    await screen.findAllByLabelText('Equation');
    const plots = () => screen.getByRole('img', { name: /\d+ plots?/ });
    expect(plots().querySelectorAll('path').length).toBe(3);
    fireEvent.click(screen.getByRole('button', { name: 'Hide y = sin(x)' }));
    expect(plots().querySelectorAll('path').length).toBe(2);
  });

  test('edit re-plots', async () => {
    vi.mocked(extractText).mockResolvedValue({
      equations: [{ latex: 'y = sin(x)', type: 'trigonometric' }],
    });
    render(<App />);
    fireEvent.change(screen.getByLabelText('Equation text'), { target: { value: 'y=sin(x)' } });
    fireEvent.click(screen.getByRole('button', { name: 'Extract equations' }));
    await screen.findAllByLabelText('Equation');
    const plot = () => screen.getByRole('img', { name: /\d+ plots?/ });
    const before = plot().querySelector('path')?.getAttribute('d');
    const input = screen.getByDisplayValue('y = sin(x)') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'y = cos(x)' } });
    fireEvent.blur(input);
    await screen.findByDisplayValue('y = cos(x)');
    const after = plot().querySelector('path')?.getAttribute('d');
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(after).not.toBe(before);
  });

  test('slider drag updates path', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Use sample' }));
    const slider = await screen.findByLabelText('k') as HTMLInputElement;
    const plot = () => screen.getByRole('img', { name: /\d+ plots?/ });
    const before = plot().querySelector('path')?.getAttribute('d');
    fireEvent.change(slider, { target: { value: '2' } });
    const after = plot().querySelector('path')?.getAttribute('d');
    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(after).not.toBe(before);
  });
});
