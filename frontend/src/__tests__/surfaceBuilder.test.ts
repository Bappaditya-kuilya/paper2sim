import { describe, test, expect } from 'vitest';
import { generateSurface, createSurfaceGeometry } from '../lib/surfaceBuilder';

describe('generateSurface', () => {
  const flatFn = (_x: number, _y: number) => 1;
  const sinFn = (x: number, _y: number) => Math.sin(x);
  const polyFn = (x: number, y: number) => x * x + y * y;

  const defaultConfig = {
    xRange: [-2, 2] as [number, number],
    yRange: [-2, 2] as [number, number],
    resolution: 10,
  };

  test('generates correct number of vertices', () => {
    const grid = generateSurface(flatFn, defaultConfig);
    const expectedVertices = (10 + 1) * (10 + 1);
    expect(grid.positions.length / 3).toBe(expectedVertices);
  });

  test('generates correct number of indices', () => {
    const grid = generateSurface(flatFn, defaultConfig);
    const expectedTriangles = 10 * 10 * 2;
    expect(grid.indices.length / 3).toBe(expectedTriangles);
  });

  test('flat function has constant z values', () => {
    const grid = generateSurface(flatFn, defaultConfig);
    for (let i = 0; i < grid.positions.length / 3; i++) {
      expect(grid.positions[i * 3 + 1]).toBe(1);
    }
  });

  test('bounds are correct for flat function', () => {
    const grid = generateSurface(flatFn, defaultConfig);
    expect(grid.bounds.minX).toBe(-2);
    expect(grid.bounds.maxX).toBe(2);
    expect(grid.bounds.minY).toBe(-2);
    expect(grid.bounds.maxY).toBe(2);
    expect(grid.bounds.minZ).toBe(1);
    expect(grid.bounds.maxZ).toBe(1);
  });

  test('sin function has varying z values', () => {
    const grid = generateSurface(sinFn, defaultConfig);
    const zValues = new Set<number>();
    for (let i = 0; i < grid.positions.length / 3; i++) {
      zValues.add(grid.positions[i * 3 + 1]);
    }
    expect(zValues.size).toBeGreaterThan(1);
  });

  test('poly function bounds are correct', () => {
    const grid = generateSurface(polyFn, defaultConfig);
    expect(grid.bounds.minZ).toBeCloseTo(0);
    expect(grid.bounds.maxZ).toBeCloseTo(8);
  });

  test('normals are unit length', () => {
    const grid = generateSurface(sinFn, { ...defaultConfig, resolution: 5 });
    for (let i = 0; i < grid.normals.length / 3; i++) {
      const nx = grid.normals[i * 3];
      const ny = grid.normals[i * 3 + 1];
      const nz = grid.normals[i * 3 + 2];
      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      expect(len).toBeCloseTo(1, 1);
    }
  });

  test('colors are in [0,1] range', () => {
    const grid = generateSurface(polyFn, defaultConfig);
    for (let i = 0; i < grid.colors.length; i++) {
      expect(grid.colors[i]).toBeGreaterThanOrEqual(0);
      expect(grid.colors[i]).toBeLessThanOrEqual(1);
    }
  });

  test('custom color function works', () => {
    const customColor = (z: number) => {
      const t = z > 0 ? 1 : 0;
      return { r: t, g: 0, b: 1 - t } as any;
    };
    const grid = generateSurface(flatFn, {
      ...defaultConfig,
      colorFn: customColor as any,
    });
    expect(grid.colors.length).toBeGreaterThan(0);
  });
});

describe('createSurfaceGeometry', () => {
  test('creates valid BufferGeometry', () => {
    const grid = generateSurface((x, y) => x + y, {
      xRange: [-1, 1],
      yRange: [-1, 1],
      resolution: 5,
    });
    const geo = createSurfaceGeometry(grid);
    expect(geo.getAttribute('position')).toBeDefined();
    expect(geo.getAttribute('normal')).toBeDefined();
    expect(geo.getAttribute('color')).toBeDefined();
    expect(geo.getIndex()).toBeDefined();
  });
});
