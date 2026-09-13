import React from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

export interface Sandbox3DProps {
  children?: React.ReactNode;
  cameraPosition?: [number, number, number];
  gridVisible?: boolean;
  axesVisible?: boolean;
}

function Scene({ children, gridVisible = true, axesVisible = true }: Omit<Sandbox3DProps, 'cameraPosition'>) {
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      {gridVisible && (
        <Grid
          args={[20, 20]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#444"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#888"
          fadeDistance={25}
          fadeStrength={1}
          position={[0, -0.01, 0]}
        />
      )}
      {axesVisible && <axesHelper args={[5]} />}
      {children}
      <OrbitControls makeDefault />
    </>
  );
}

export function Sandbox3D({
  children,
  cameraPosition = [5, 5, 5],
  gridVisible = true,
  axesVisible = true,
}: Sandbox3DProps) {
  return (
    <div className="h-full w-full rounded-lg border border-zinc-800 bg-zinc-950">
      <Canvas
        camera={{ position: cameraPosition, fov: 50 }}
        gl={{ antialias: true }}
      >
        <Scene gridVisible={gridVisible} axesVisible={axesVisible}>
          {children}
        </Scene>
      </Canvas>
    </div>
  );
}

export interface SurfaceMeshProps {
  geometry: THREE.BufferGeometry;
  wireframe?: boolean;
  opacity?: number;
}

export function SurfaceMesh({ geometry, wireframe = false, opacity = 1 }: SurfaceMeshProps) {
  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        wireframe={wireframe}
        side={THREE.DoubleSide}
        transparent={opacity < 1}
        opacity={opacity}
      />
    </mesh>
  );
}
