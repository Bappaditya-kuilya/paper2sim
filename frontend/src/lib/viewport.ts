export interface Viewport {
  x: [number, number];
  y: [number, number];
}

export const DEFAULT_VIEWPORT: Viewport = { x: [-10, 10], y: [-10, 10] };

const MIN_SPAN = 0.5;
const MAX_SPAN = 40;

export function panViewport(v: Viewport, dx: number, dy: number): Viewport {
  return {
    x: [v.x[0] + dx, v.x[1] + dx],
    y: [v.y[0] + dy, v.y[1] + dy],
  };
}

function zoomAxis(range: [number, number], c: number, factor: number): [number, number] {
  const span = Math.min(MAX_SPAN, Math.max(MIN_SPAN, (range[1] - range[0]) / factor));
  const t = (c - range[0]) / (range[1] - range[0]);
  return [c - span * t, c + span * (1 - t)];
}

export function zoomViewport(v: Viewport, cx: number, cy: number, factor: number): Viewport {
  if (!Number.isFinite(factor) || factor <= 0) return v;
  return { x: zoomAxis(v.x, cx, factor), y: zoomAxis(v.y, cy, factor) };
}
