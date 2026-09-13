import { useState, useCallback } from 'react';
import * as THREE from 'three';

export interface MatrixVisProps {
  matrix?: number[][];
  onEdit?: (row: number, col: number, value: number) => void;
  showDotProduct?: boolean;
  vector?: number[];
}

export function MatrixVis({
  matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
  ],
  onEdit,
  showDotProduct = false,
  vector = [1, 0, 0],
}: MatrixVisProps) {
  const [editCell, setEditCell] = useState<{ row: number; col: number } | null>(null);

  const rows = matrix.length;
  const cols = matrix[0]?.length || 0;

  const cellSize = 0.8;
  const gap = 0.1;
  const totalWidth = cols * (cellSize + gap);
  const totalHeight = rows * (cellSize + gap);

  const maxValue = Math.max(...matrix.flat().map(Math.abs), 1);

  const dotProduct = showDotProduct && vector.length === cols
    ? matrix.map((row) => row.reduce((sum, val, i) => sum + val * (vector[i] || 0), 0))
    : null;

  const handleCellClick = useCallback(
    (row: number, col: number) => {
      if (onEdit) {
        setEditCell({ row, col });
      }
    },
    [onEdit, matrix]
  );

  return (
    <group position={[-totalWidth / 2, -totalHeight / 2, 0]}>
      {matrix.map((row, ri) =>
        row.map((val, ci) => {
          const intensity = Math.abs(val) / maxValue;
          const color = val >= 0
            ? new THREE.Color().setHSL(0.6, 0.8, 0.3 + intensity * 0.4)
            : new THREE.Color().setHSL(0, 0.8, 0.3 + intensity * 0.4);

          return (
            <group key={`${ri}-${ci}`} position={[ci * (cellSize + gap), (rows - 1 - ri) * (cellSize + gap), 0]}>
              <mesh onClick={() => handleCellClick(ri, ci)}>
                <boxGeometry args={[cellSize, cellSize, 0.1]} />
                <meshStandardMaterial color={color} />
              </mesh>
              {editCell?.row === ri && editCell?.col === ci ? (
                <mesh position={[0, 0, 0.1]}>
                  <planeGeometry args={[cellSize * 0.8, cellSize * 0.4]} />
                  <meshBasicMaterial color="white" />
                </mesh>
              ) : (
                <mesh position={[0, 0, 0.06]}>
                  <planeGeometry args={[cellSize * 0.8, cellSize * 0.3]} />
                  <meshBasicMaterial color="white" transparent opacity={0.9} />
                </mesh>
              )}
            </group>
          );
        })
      )}
      {showDotProduct && dotProduct && (
        <group position={[totalWidth + 0.5, 0, 0]}>
          {dotProduct.map((_dpVal, i) => (
            <group key={i} position={[0, (rows - 1 - i) * (cellSize + gap), 0]}>
              <mesh>
                <boxGeometry args={[cellSize * 0.6, cellSize * 0.6, 0.1]} />
                <meshStandardMaterial color="#22c55e" />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}
