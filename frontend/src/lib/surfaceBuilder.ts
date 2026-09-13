import * as THREE from 'three';

export interface SurfaceGrid {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint16Array;
  bounds: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number };
}

export interface SurfaceConfig {
  xRange: [number, number];
  yRange: [number, number];
  resolution: number;
  colorFn?: (z: number, minZ: number, maxZ: number) => THREE.Color;
}

const defaultColorFn = (z: number, minZ: number, maxZ: number): THREE.Color => {
  const t = maxZ === minZ ? 0.5 : (z - minZ) / (maxZ - minZ);
  const h = (1.0 - t) * 0.6;
  return new THREE.Color().setHSL(h, 0.8, 0.5);
};

export function generateSurface(
  fn: (x: number, y: number) => number,
  config: SurfaceConfig
): SurfaceGrid {
  const { xRange, yRange, resolution, colorFn = defaultColorFn } = config;
  const [xMin, xMax] = xRange;
  const [yMin, yMax] = yRange;
  const n = resolution;
  const size = (n + 1) * (n + 1);

  const positions = new Float32Array(size * 3);
  const normals = new Float32Array(size * 3);
  const colors = new Float32Array(size * 3);

  let minZ = Infinity;
  let maxZ = -Infinity;

  for (let iy = 0; iy <= n; iy++) {
    for (let ix = 0; ix <= n; ix++) {
      const x = xMin + (ix / n) * (xMax - xMin);
      const y = yMin + (iy / n) * (yMax - yMin);
      const z = fn(x, y);
      const idx = (iy * (n + 1) + ix) * 3;
      positions[idx] = x;
      positions[idx + 1] = z;
      positions[idx + 2] = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
  }

  for (let iy = 0; iy <= n; iy++) {
    for (let ix = 0; ix <= n; ix++) {
      const idx = (iy * (n + 1) + ix) * 3;
      const z = positions[idx + 1];
      const c = colorFn(z, minZ, maxZ);
      colors[idx] = c.r;
      colors[idx + 1] = c.g;
      colors[idx + 2] = c.b;
    }
  }

  for (let iy = 0; iy <= n; iy++) {
    for (let ix = 0; ix <= n; ix++) {
      const idx = (iy * (n + 1) + ix) * 3;
      const hx = 1e-4;
      const zL = fn(Math.max(xMin, xMin + ((ix - 1) / n) * (xMax - xMin)), yMin + (iy / n) * (yMax - yMin));
      const zR = fn(Math.min(xMax, xMin + ((ix + 1) / n) * (xMax - xMin)), yMin + (iy / n) * (yMax - yMin));
      const zD = fn(xMin + (ix / n) * (xMax - xMin), Math.max(yMin, yMin + ((iy - 1) / n) * (yMax - yMin)));
      const zU = fn(xMin + (ix / n) * (xMax - xMin), Math.min(yMax, yMin + ((iy + 1) / n) * (yMax - yMin)));

      const dx = (zR - zL) / (2 * hx);
      const dy = (zU - zD) / (2 * hx);
      const len = Math.sqrt(dx * dx + 1 + dy * dy) || 1;

      normals[idx] = -dx / len;
      normals[idx + 1] = 1 / len;
      normals[idx + 2] = -dy / len;
    }
  }

  const triCount = n * n * 2;
  const indices = new Uint16Array(triCount * 3);
  let ti = 0;

  for (let iy = 0; iy < n; iy++) {
    for (let ix = 0; ix < n; ix++) {
      const a = iy * (n + 1) + ix;
      const b = a + 1;
      const c = a + (n + 1);
      const d = c + 1;

      indices[ti++] = a;
      indices[ti++] = c;
      indices[ti++] = b;

      indices[ti++] = b;
      indices[ti++] = c;
      indices[ti++] = d;
    }
  }

  return {
    positions,
    normals,
    colors,
    indices,
    bounds: { minX: xMin, maxX: xMax, minY: yMin, maxY: yMax, minZ, maxZ },
  };
}

export function createSurfaceGeometry(grid: SurfaceGrid): THREE.BufferGeometry {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(grid.positions, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(grid.normals, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(grid.colors, 3));
  geo.setIndex(new THREE.BufferAttribute(grid.indices, 1));
  return geo;
}
