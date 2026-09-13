import { useMemo } from 'react';
import { generateSurface, createSurfaceGeometry } from '../../lib/surfaceBuilder';
import { SurfaceMesh } from './Sandbox3D';

export interface LogSurfaceProps {
  base?: number;
  xRange?: [number, number];
  yRange?: [number, number];
  resolution?: number;
  wireframe?: boolean;
}

export function LogSurface({
  base = Math.E,
  xRange = [0.1, 5],
  yRange = [0.1, 5],
  resolution = 50,
  wireframe = false,
}: LogSurfaceProps) {
  const geometry = useMemo(() => {
    const fn = (x: number, y: number) => Math.log(x + y) / Math.log(base);
    const grid = generateSurface(fn, { xRange, yRange, resolution });
    return createSurfaceGeometry(grid);
  }, [base, xRange, yRange, resolution]);

  return <SurfaceMesh geometry={geometry} wireframe={wireframe} />;
}
