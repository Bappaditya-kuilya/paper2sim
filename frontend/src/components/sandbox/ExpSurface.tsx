import React, { useMemo } from 'react';
import { generateSurface, createSurfaceGeometry } from '../../lib/surfaceBuilder';
import { SurfaceMesh } from './Sandbox3D';

export interface ExpSurfaceProps {
  base?: number;
  xRange?: [number, number];
  yRange?: [number, number];
  resolution?: number;
  wireframe?: boolean;
}

export function ExpSurface({
  base = Math.E,
  xRange = [-3, 3],
  yRange = [-3, 3],
  resolution = 50,
  wireframe = false,
}: ExpSurfaceProps) {
  const geometry = useMemo(() => {
    const fn = (x: number, y: number) => Math.pow(base, x + y);
    const grid = generateSurface(fn, { xRange, yRange, resolution });
    return createSurfaceGeometry(grid);
  }, [base, xRange, yRange, resolution]);

  return <SurfaceMesh geometry={geometry} wireframe={wireframe} />;
}
