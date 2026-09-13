import React, { useMemo } from 'react';
import { generateSurface, createSurfaceGeometry } from '../../lib/surfaceBuilder';
import { SurfaceMesh } from './Sandbox3D';

export interface TrigSurfaceProps {
  expression: string;
  xRange?: [number, number];
  yRange?: [number, number];
  resolution?: number;
  wireframe?: boolean;
}

const TRIG_FNS: Record<string, (x: number, y: number) => number> = {
  sin: (x, y) => Math.sin(x) * Math.cos(y),
  cos: (x, y) => Math.cos(x) + Math.cos(y),
  tan: (x, y) => Math.tan(x * y),
  sec: (x, y) => 1 / Math.cos(x + y),
  csc: (x, y) => 1 / Math.sin(x + y),
  cot: (x, y) => 1 / Math.tan(x + y),
};

function detectTrigFn(expression: string): (x: number, y: number) => number {
  const s = expression.toLowerCase();
  for (const [name, fn] of Object.entries(TRIG_FNS)) {
    if (s.includes(name)) return fn;
  }
  return TRIG_FNS.sin;
}

export function TrigSurface({
  expression,
  xRange = [-3.14, 3.14],
  yRange = [-3.14, 3.14],
  resolution = 50,
  wireframe = false,
}: TrigSurfaceProps) {
  const geometry = useMemo(() => {
    const fn = detectTrigFn(expression);
    const grid = generateSurface(fn, { xRange, yRange, resolution });
    return createSurfaceGeometry(grid);
  }, [expression, xRange, yRange, resolution]);

  return <SurfaceMesh geometry={geometry} wireframe={wireframe} />;
}
