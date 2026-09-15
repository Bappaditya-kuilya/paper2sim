import { useMemo } from 'react';
import { Vector3 } from 'three';
import { Line } from '@react-three/drei';

export interface SlopeFieldProps {
  expression: string;
  xRange?: [number, number];
  yRange?: [number, number];
  resolution?: number;
  initialConditions?: Array<{ x: number; y: number; color?: string }>;
  solutionSteps?: number;
}

function evalODE(expression: string, x: number, y: number): number {
  try {
    const expr = expression
      .replace(/dy\/dx/g, '1')
      .replace(/y'/g, '1')
      .replace(/\bx\b/g, `(${x})`)
      .replace(/\by\b/g, `(${y})`);
    return Function(`"use strict"; return (${expr})`)() as number;
  } catch {
    return 0;
  }
}

export function SlopeField({
  expression = 'y',
  xRange = [-5, 5],
  yRange = [-5, 5],
  resolution = 20,
  initialConditions = [],
  solutionSteps = 100,
}: SlopeFieldProps) {
  const segments = useMemo(() => {
    const result: Array<{ start: Vector3; end: Vector3; color: string }> = [];
    const [xMin, xMax] = xRange;
    const [yMin, yMax] = yRange;
    const dx = (xMax - xMin) / resolution;
    const dy = (yMax - yMin) / resolution;

    for (let ix = 0; ix <= resolution; ix++) {
      for (let iy = 0; iy <= resolution; iy++) {
        const x = xMin + ix * dx;
        const y = yMin + iy * dy;
        const slope = evalODE(expression, x, y);
        const len = 0.3;
        const angle = Math.atan(slope);
        const startX = x - (len / 2) * Math.cos(angle);
        const startY = y - (len / 2) * Math.sin(angle);
        const endX = x + (len / 2) * Math.cos(angle);
        const endY = y + (len / 2) * Math.sin(angle);

        const magnitude = Math.abs(slope);
        let color = '#60a5fa';
        if (magnitude > 2) color = '#ef4444';
        else if (magnitude > 1) color = '#eab308';

        result.push({
          start: new Vector3(startX, startY, 0),
          end: new Vector3(endX, endY, 0),
          color,
        });
      }
    }
    return result;
  }, [expression, xRange, yRange, resolution]);

  const solutionCurves = useMemo(() => {
    const curves: Array<{ points: Vector3[]; color: string }> = [];
    const [xMin, xMax] = xRange;
    const step = (xMax - xMin) / solutionSteps;

    for (const ic of initialConditions) {
      const points: Vector3[] = [];
      let x = ic.x;
      let y = ic.y;

      for (let i = 0; i < solutionSteps; i++) {
        points.push(new Vector3(x, y, 0.01));
        const slope = evalODE(expression, x, y);
        x += step;
        y += slope * step;

        if (x > xMax || x < xMin || y > 10 || y < -10) break;
      }

      curves.push({
        points,
        color: ic.color || '#22c55e',
      });
    }
    return curves;
  }, [expression, initialConditions, solutionSteps, xRange]);

  return (
    <group>
      {segments.map((seg, i) => {
        return (
          <Line key={`seg-${i}`} points={[seg.start, seg.end]} color={seg.color} lineWidth={1} />
        );
      })}
      {solutionCurves.map((curve, i) => {
        if (curve.points.length < 2) return null;
        return (
          <Line key={`curve-${i}`} points={curve.points} color={curve.color} lineWidth={2} />
        );
      })}
      {initialConditions.map((ic, i) => (
        <mesh key={`ic-${i}`} position={[ic.x, ic.y, 0.02]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshStandardMaterial color={ic.color || '#22c55e'} />
        </mesh>
      ))}
    </group>
  );
}
