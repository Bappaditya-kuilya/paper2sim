import React from 'react';
import * as THREE from 'three';

export interface ProbDiagramProps {
  pA?: number;
  pB?: number;
  pAandB?: number;
  showConditional?: boolean;
  showSliders?: boolean;
}

export function ProbDiagram({
  pA: _pA,
  pB: _pB,
  pAandB: _pAandB,
  showConditional = false,
  showSliders = true,
}: ProbDiagramProps) {
  const circleRadius = 1.5;
  const offset = 0.8;

  return (
    <group>
      <mesh position={[-offset, 0, 0]}>
        <circleGeometry args={[circleRadius, 32]} />
        <meshStandardMaterial color="#3b82f6" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[offset, 0, 0]}>
        <circleGeometry args={[circleRadius, 32]} />
        <meshStandardMaterial color="#ef4444" transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>

      <mesh position={[0, 0, 0.01]}>
        <circleGeometry args={[circleRadius * 0.5, 32]} />
        <meshStandardMaterial color="#a855f7" transparent opacity={0.6} side={THREE.DoubleSide} />
      </mesh>

      {showConditional && (
        <group position={[0, -3, 0]}>
          <mesh position={[-1, 0, 0]}>
            <boxGeometry args={[1.5, 0.5, 0.1]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
          <mesh position={[1, 0, 0]}>
            <boxGeometry args={[1.5, 0.5, 0.1]} />
            <meshStandardMaterial color="#eab308" />
          </mesh>
        </group>
      )}

      {showSliders && (
        <group position={[0, -4, 0]}>
          <mesh position={[-1.5, 0, 0]}>
            <boxGeometry args={[0.3, 2, 0.1]} />
            <meshStandardMaterial color="#6b7280" />
          </mesh>
          <mesh position={[1.5, 0, 0]}>
            <boxGeometry args={[0.3, 2, 0.1]} />
            <meshStandardMaterial color="#6b7280" />
          </mesh>
        </group>
      )}
    </group>
  );
}

export interface CalculatorDisplayProps {
  expression?: string;
  result?: number;
  history?: string[];
}

export function CalculatorDisplay({
  expression: _expression,
  result: _result,
  history = [],
}: CalculatorDisplayProps) {
  return (
    <group>
      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[4, 1, 0.2]} />
        <meshStandardMaterial color="#1f2937" />
      </mesh>

      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[4, 3, 0.1]} />
        <meshStandardMaterial color="#374151" />
      </mesh>

      {Array.from({ length: 4 }).map((_, row) =>
        Array.from({ length: 3 }).map((_, col) => (
          <mesh
            key={`${row}-${col}`}
            position={[-1.2 + col * 1.2, 0.8 - row * 0.8, 0.06]}
          >
            <boxGeometry args={[0.8, 0.6, 0.05]} />
            <meshStandardMaterial color="#4b5563" />
          </mesh>
        ))
      )}

      {history.slice(-5).map((_, i) => (
        <mesh key={i} position={[0, 2.8 - i * 0.3, 0.1]}>
          <boxGeometry args={[3.5, 0.2, 0.02]} />
          <meshStandardMaterial color="#6b7280" />
        </mesh>
      ))}
    </group>
  );
}
