import React, { useMemo } from 'react';
import { generateSurface, createSurfaceGeometry } from '../../lib/surfaceBuilder';
import { SurfaceMesh } from './Sandbox3D';

export interface PolySurfaceProps {
  coefficients: number[];
  xRange?: [number, number];
  yRange?: [number, number];
  resolution?: number;
  wireframe?: boolean;
}

export function PolySurface({
  coefficients,
  xRange = [-3, 3],
  yRange = [-3, 3],
  resolution = 50,
  wireframe = false,
}: PolySurfaceProps) {
  const geometry = useMemo(() => {
    const fn = (x: number, y: number) => {
      let z = 0;
      for (let i = 0; i < coefficients.length; i++) {
        z += coefficients[i] * Math.pow(x, i);
      }
      z += y * y;
      return z;
    };
    const grid = generateSurface(fn, { xRange, yRange, resolution });
    return createSurfaceGeometry(grid);
  }, [coefficients, xRange, yRange, resolution]);

  return <SurfaceMesh geometry={geometry} wireframe={wireframe} />;
}
