import React, { useMemo, useCallback, useState } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { generateSurface, createSurfaceGeometry } from '../../lib/surfaceBuilder';
import { math } from '../../lib/mathParser';

export interface GenericSurfaceProps {
  expression: string;
  variables?: string[];
  xRange?: [number, number];
  yRange?: [number, number];
  resolution?: number;
  wireframe?: boolean;
  onHover?: (info: { x: number; y: number; z: number } | null) => void;
}

export function GenericSurface({
  expression,
  variables = ['x', 'y'],
  xRange = [-5, 5],
  yRange = [-5, 5],
  resolution = 50,
  wireframe = false,
  onHover,
}: GenericSurfaceProps) {
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number; z: number } | null>(null);

  const geometry = useMemo(() => {
    try {
      const compiled = math.compile(expression);
      const fn = (x: number, y: number) => {
        const scope = variables.length === 1 ? { x } : { x, y };
        const result = compiled.evaluate(scope);
        return typeof result === 'number' && isFinite(result) ? result : 0;
      };
      const grid = generateSurface(fn, { xRange, yRange, resolution });
      return createSurfaceGeometry(grid);
    } catch {
      return new THREE.BufferGeometry();
    }
  }, [expression, variables, xRange, yRange, resolution]);

  const handlePointerMove = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (e.point) {
        const pos = { x: e.point.x, y: e.point.z, z: e.point.y };
        setHoverPos(pos);
        onHover?.(pos);
      }
    },
    [onHover] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const handlePointerLeave = useCallback(() => {
    setHoverPos(null);
    onHover?.(null);
  }, [onHover]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <group>
      <mesh
        geometry={geometry}
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
      >
        <meshStandardMaterial
          vertexColors
          wireframe={wireframe}
          side={THREE.DoubleSide}
        />
      </mesh>
      {hoverPos && (
        <mesh position={[hoverPos.x, hoverPos.z + 0.1, hoverPos.y]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="white" />
        </mesh>
      )}
    </group>
  );
}

export interface ParametricSurfaceProps {
  expressionX: string;
  expressionY: string;
  expressionZ: string;
  uRange?: [number, number];
  vRange?: [number, number];
  resolution?: number;
  wireframe?: boolean;
  onHover?: (info: { u: number; v: number; x: number; y: number; z: number } | null) => void;
}

export function ParametricSurface({
  expressionX,
  expressionY,
  expressionZ,
  uRange = [0, Math.PI * 2],
  vRange = [0, Math.PI],
  resolution = 50,
  wireframe = false,
  onHover: _onHover,
}: ParametricSurfaceProps) {
  const geometry = useMemo(() => {
    try {
      const compiledX = math.compile(expressionX);
      const compiledY = math.compile(expressionY);
      const compiledZ = math.compile(expressionZ);
      const n = resolution;
      const size = (n + 1) * (n + 1);
      const positions = new Float32Array(size * 3);
      const normals = new Float32Array(size * 3);
      const colors = new Float32Array(size * 3);

      for (let iv = 0; iv <= n; iv++) {
        for (let iu = 0; iu <= n; iu++) {
          const u = uRange[0] + (iu / n) * (uRange[1] - uRange[0]);
          const v = vRange[0] + (iv / n) * (vRange[1] - vRange[0]);
          const scope = { u, v };
          const x = compiledX.evaluate(scope);
          const y = compiledY.evaluate(scope);
          const z = compiledZ.evaluate(scope);
          const idx = (iv * (n + 1) + iu) * 3;
          positions[idx] = x;
          positions[idx + 1] = y;
          positions[idx + 2] = z;
        }
      }

      for (let i = 0; i < size; i++) {
        normals[i * 3] = 0;
        normals[i * 3 + 1] = 1;
        normals[i * 3 + 2] = 0;
        const t = positions[i * 3 + 1] / 5;
        const h = (1.0 - Math.max(0, Math.min(1, t))) * 0.6;
        const c = new THREE.Color().setHSL(h, 0.8, 0.5);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      const triCount = n * n * 2;
      const indices = new Uint16Array(triCount * 3);
      let ti = 0;
      for (let iv = 0; iv < n; iv++) {
        for (let iu = 0; iu < n; iu++) {
          const a = iv * (n + 1) + iu;
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

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geo.setIndex(new THREE.BufferAttribute(indices, 1));
      return geo;
    } catch {
      return new THREE.BufferGeometry();
    }
  }, [expressionX, expressionY, expressionZ, uRange, vRange, resolution]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors wireframe={wireframe} side={THREE.DoubleSide} />
    </mesh>
  );
}
