import { useMemo } from 'react';
import * as THREE from 'three';

export interface ForceFieldProps {
  expression?: string;
  mass?: number;
  acceleration?: number;
  gridSize?: number;
  arrowScale?: number;
}

function Arrow({ origin, direction, color, scale }: { origin: THREE.Vector3; direction: THREE.Vector3; color: string; scale: number }) {
  const dir = direction.clone().normalize();
  const length = direction.length() * scale;

  return (
    <arrowHelper args={[dir, origin, length, color, length * 0.3, length * 0.15]} />
  );
}

export function ForceField({
  expression: _expression,
  mass = 1,
  acceleration = 9.81,
  gridSize = 5,
  arrowScale = 0.3,
}: ForceFieldProps) {
  const arrows = useMemo(() => {
    const result: Array<{ origin: THREE.Vector3; direction: THREE.Vector3; color: string }> = [];
    const step = (gridSize * 2) / 10;

    for (let x = -gridSize; x <= gridSize; x += step) {
      for (let z = -gridSize; z <= gridSize; z += step) {
        const force = mass * acceleration;
        const dx = -x * 0.1;
        const dz = -z * 0.1;
        const dy = force * 0.01;
        const direction = new THREE.Vector3(dx, dy, dz);
        const magnitude = direction.length();

        let color = '#22c55e';
        if (magnitude > 2) color = '#ef4444';
        else if (magnitude > 1) color = '#eab308';

        result.push({
          origin: new THREE.Vector3(x, 0, z),
          direction,
          color,
        });
      }
    }
    return result;
  }, [mass, acceleration, gridSize]);

  return (
    <group>
      {arrows.map((arrow, i) => (
        <Arrow key={i} {...arrow} scale={arrowScale} />
      ))}
    </group>
  );
}

export interface EnergySurfaceProps {
  mass?: number;
  gravity?: number;
  springConstant?: number;
  xRange?: [number, number];
  yRange?: [number, number];
  resolution?: number;
}

export function EnergySurface({
  mass = 1,
  gravity = 9.81,
  springConstant = 1,
  xRange = [-3, 3],
  yRange = [-3, 3],
  resolution = 50,
}: EnergySurfaceProps) {
  const geometry = useMemo(() => {
    const n = resolution;
    const size = (n + 1) * (n + 1);
    const positions = new Float32Array(size * 3);
    const normals = new Float32Array(size * 3);
    const colors = new Float32Array(size * 3);

    const [xMin, xMax] = xRange;
    const [yMin, yMax] = yRange;

    for (let iy = 0; iy <= n; iy++) {
      for (let ix = 0; ix <= n; ix++) {
        const x = xMin + (ix / n) * (xMax - xMin);
        const y = yMin + (iy / n) * (yMax - yMin);
        const z = 0.5 * mass * gravity * y + 0.5 * springConstant * x * x;
        const idx = (iy * (n + 1) + ix) * 3;
        positions[idx] = x;
        positions[idx + 1] = z;
        positions[idx + 2] = y;
      }
    }

    for (let i = 0; i < size; i++) {
      normals[i * 3] = 0;
      normals[i * 3 + 1] = 1;
      normals[i * 3 + 2] = 0;
      const t = Math.min(1, Math.max(0, (positions[i * 3 + 1] + 10) / 20));
      const h = (1 - t) * 0.7;
      const c = new THREE.Color().setHSL(h, 0.8, 0.5);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
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

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }, [mass, gravity, springConstant, xRange, yRange, resolution]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  );
}

export interface OhmSurfaceProps {
  resistance?: number;
  maxCurrent?: number;
  maxVoltage?: number;
  resolution?: number;
}

export function OhmSurface({
  resistance = 10,
  maxCurrent = 5,
  maxVoltage = 50,
  resolution = 50,
}: OhmSurfaceProps) {
  const geometry = useMemo(() => {
    const n = resolution;
    const size = (n + 1) * (n + 1);
    const positions = new Float32Array(size * 3);
    const normals = new Float32Array(size * 3);
    const colors = new Float32Array(size * 3);

    for (let iy = 0; iy <= n; iy++) {
      for (let ix = 0; ix <= n; ix++) {
        const current = (ix / n) * maxCurrent;
        const voltage = current * resistance;
        const x = current;
        const z = (iy / n) * 5;
        const y = voltage;
        const idx = (iy * (n + 1) + ix) * 3;
        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = z;
      }
    }

    for (let i = 0; i < size; i++) {
      normals[i * 3] = 0;
      normals[i * 3 + 1] = 1;
      normals[i * 3 + 2] = 0;
      const t = Math.min(1, positions[i * 3 + 1] / maxVoltage);
      const h = (1 - t) * 0.15;
      const c = new THREE.Color().setHSL(h, 0.9, 0.5);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
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

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }, [resistance, maxCurrent, maxVoltage, resolution]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  );
}

export interface PowerSurfaceProps {
  resistance?: number;
  maxCurrent?: number;
  resolution?: number;
}

export function PowerSurface({
  resistance = 10,
  maxCurrent = 5,
  resolution = 50,
}: PowerSurfaceProps) {
  const geometry = useMemo(() => {
    const n = resolution;
    const size = (n + 1) * (n + 1);
    const positions = new Float32Array(size * 3);
    const normals = new Float32Array(size * 3);
    const colors = new Float32Array(size * 3);

    for (let iy = 0; iy <= n; iy++) {
      for (let ix = 0; ix <= n; ix++) {
        const current = (ix / n) * maxCurrent;
        const power = current * current * resistance;
        const x = current;
        const z = (iy / n) * 5;
        const y = power;
        const idx = (iy * (n + 1) + ix) * 3;
        positions[idx] = x;
        positions[idx + 1] = y;
        positions[idx + 2] = z;
      }
    }

    for (let i = 0; i < size; i++) {
      normals[i * 3] = 0;
      normals[i * 3 + 1] = 1;
      normals[i * 3 + 2] = 0;
      const maxPower = maxCurrent * maxCurrent * resistance;
      const t = Math.min(1, positions[i * 3 + 1] / maxPower);
      const h = (1 - t) * 0.1;
      const c = new THREE.Color().setHSL(h, 0.9, 0.5);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
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

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(new THREE.BufferAttribute(indices, 1));
    return geo;
  }, [resistance, maxCurrent, resolution]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  );
}
