import { useMemo } from 'react';
import { Vector3 } from 'three';
import { Line } from '@react-three/drei';

export interface TrajectoryRendererProps {
  expression?: string;
  trajectory?: Array<[number, number, number]>;
  vectors?: Array<{ origin: [number, number, number]; dir: [number, number, number] }>;
  color?: string;
  lineWidth?: number;
}

// Port of ForceField line-drawing, generalized to arbitrary point paths (PRD §7:
// N-body, orbital mechanics, photon geodesics). Reuses SlopeField drei Line pattern.
export function TrajectoryRenderer({
  trajectory = [],
  vectors = [],
  color = '#22d3ee',
  lineWidth = 2,
}: TrajectoryRendererProps) {
  const points = useMemo(() => trajectory.map(([x, y, z]) => new Vector3(x, y, z)), [trajectory]);
  const vecSegs = useMemo(
    () =>
      vectors.map((v) => ({
        start: new Vector3(...v.origin),
        end: new Vector3(v.origin[0] + v.dir[0], v.origin[1] + v.dir[1], v.origin[2] + v.dir[2]),
      })),
    [vectors],
  );
  return (
    <group>
      {points.length >= 2 && <Line points={points} color={color} lineWidth={lineWidth} />}
      {points.length === 1 && (
        <mesh position={points[0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}
      {points.length >= 2 && (
        <mesh position={points[points.length - 1]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial color={color} />
        </mesh>
      )}
      {vecSegs.map((s, i) => (
        <Line key={`vec-${i}`} points={[s.start, s.end]} color="#eab308" lineWidth={1} />
      ))}
    </group>
  );
}
