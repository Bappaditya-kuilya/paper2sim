import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export interface SpringForceProps {
  springConstant?: number;
  restLength?: number;
  damping?: number;
  mass?: number;
  initialDisplacement?: number;
}

export function SpringForce({
  springConstant = 5,
  restLength = 2,
  damping = 0.5,
  mass = 1,
  initialDisplacement = 1,
}: SpringForceProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    timeRef.current += delta;
    const t = timeRef.current;
    const omega = Math.sqrt(springConstant / mass);
    const x = initialDisplacement * Math.exp(-damping * t) * Math.cos(omega * t);
    groupRef.current.position.x = x;
  });

  const springPoints = useMemo(() => {
    const points: THREE.Vector3[] = [];
    const coils = 10;
    const amplitude = 0.3;
    for (let i = 0; i <= coils * 20; i++) {
      const t = i / (coils * 20);
      const x = t * restLength;
      const y = amplitude * Math.sin(t * coils * Math.PI * 2);
      const z = amplitude * Math.cos(t * coils * Math.PI * 2);
      points.push(new THREE.Vector3(x, y, z));
    }
    return points;
  }, [restLength]);

  const springGeometry = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(springPoints);
    return new THREE.TubeGeometry(curve, 100, 0.05, 8, false);
  }, [springPoints]);

  return (
    <group ref={groupRef}>
      <mesh geometry={springGeometry}>
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      <mesh position={[restLength + initialDisplacement, 0, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.2, 0.5, 0.5]} />
        <meshStandardMaterial color="#6b7280" />
      </mesh>
    </group>
  );
}

export interface GravitationalForceProps {
  mass1?: number;
  mass2?: number;
  distance?: number;
  g?: number;
}

export function GravitationalForce({
  mass1 = 10,
  mass2 = 5,
  distance = 3,
  g = 6.674,
}: GravitationalForceProps) {
  const force = (g * mass1 * mass2) / (distance * distance);
  const r1 = Math.pow(mass1, 1 / 3) * 0.3;
  const r2 = Math.pow(mass2, 1 / 3) * 0.3;

  return (
    <group>
      <mesh position={[-distance / 2, 0, 0]}>
        <sphereGeometry args={[r1, 32, 32]} />
        <meshStandardMaterial color="#3b82f6" />
      </mesh>
      <mesh position={[distance / 2, 0, 0]}>
        <sphereGeometry args={[r2, 32, 32]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
      <group position={[-distance / 2 + r1 + 0.2, 0.5, 0]}>
        <mesh>
          <coneGeometry args={[0.1, 0.4, 8]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
      </group>
      <group position={[distance / 2 - r2 - 0.2, 0.5, 0]}>
        <mesh rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[0.1, 0.4, 8]} />
          <meshStandardMaterial color="#22c55e" />
        </mesh>
      </group>
    </group>
  );
}

export interface CoulombForceProps {
  charge1?: number;
  charge2?: number;
  distance?: number;
  k?: number;
}

export function CoulombForce({
  charge1 = 1,
  charge2 = -1,
  distance = 2,
  k = 8.988,
}: CoulombForceProps) {
  const force = (k * charge1 * charge2) / (distance * distance);
  const isAttractive = force < 0;

  return (
    <group>
      <mesh position={[-distance / 2, 0, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={charge1 > 0 ? '#ef4444' : '#3b82f6'} />
      </mesh>
      <mesh position={[distance / 2, 0, 0]}>
        <sphereGeometry args={[0.3, 32, 32]} />
        <meshStandardMaterial color={charge2 > 0 ? '#ef4444' : '#3b82f6'} />
      </mesh>
      {isAttractive && (
        <>
          <group position={[-distance / 2 + 0.5, 0.5, 0]}>
            <mesh>
              <coneGeometry args={[0.08, 0.3, 8]} />
              <meshStandardMaterial color="#22c55e" />
            </mesh>
          </group>
          <group position={[distance / 2 - 0.5, 0.5, 0]}>
            <mesh rotation={[0, 0, Math.PI]}>
              <coneGeometry args={[0.08, 0.3, 8]} />
              <meshStandardMaterial color="#22c55e" />
            </mesh>
          </group>
        </>
      )}
    </group>
  );
}

export interface IdealGasProps {
  temperature?: number;
  volume?: number;
  nMoles?: number;
  particleCount?: number;
}

export function IdealGas({
  temperature = 300,
  volume = 1,
  nMoles = 1,
  particleCount = 50,
}: IdealGasProps) {
  const R = 8.314;
  const pressure = (nMoles * R * temperature) / volume;
  const boxSize = Math.pow(volume, 1 / 3) * 2;

  const particles = useMemo(() => {
    return Array.from({ length: particleCount }, (_, i) => ({
      id: i,
      position: [
        (Math.random() - 0.5) * boxSize,
        (Math.random() - 0.5) * boxSize,
        (Math.random() - 0.5) * boxSize,
      ] as [number, number, number],
      velocity: [
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
      ] as [number, number, number],
    }));
  }, [particleCount, boxSize]);

  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach((child, i) => {
      const particle = particles[i];
      if (particle) {
        child.position.x += particle.velocity[0];
        child.position.y += particle.velocity[1];
        child.position.z += particle.velocity[2];

        if (Math.abs(child.position.x) > boxSize / 2) particle.velocity[0] *= -1;
        if (Math.abs(child.position.y) > boxSize / 2) particle.velocity[1] *= -1;
        if (Math.abs(child.position.z) > boxSize / 2) particle.velocity[2] *= -1;
      }
    });
  });

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[boxSize, boxSize, boxSize]} />
        <meshStandardMaterial color="#1f2937" transparent opacity={0.2} wireframe />
      </mesh>
      {particles.map((p) => (
        <mesh key={p.id} position={p.position}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial color="#60a5fa" />
        </mesh>
      ))}
    </group>
  );
}
