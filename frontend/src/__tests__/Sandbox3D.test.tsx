import { describe, test, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SurfaceMesh } from '../components/sandbox/Sandbox3D';
import * as THREE from 'three';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children: React.ReactNode }) => <div data-testid="mock-canvas">{children}</div>,
}));

vi.mock('@react-three/drei', () => ({
  OrbitControls: () => null,
  Grid: () => null,
  AxesHelper: () => null,
}));

import { Sandbox3D } from '../components/sandbox/Sandbox3D';

describe('Sandbox3D', () => {
  test('renders canvas container', () => {
    const { container } = render(<Sandbox3D />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with custom camera position', () => {
    const { container } = render(<Sandbox3D cameraPosition={[10, 10, 10]} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders children inside canvas', () => {
    render(
      <Sandbox3D>
        <mesh data-testid="test-mesh">
          <boxGeometry />
          <meshStandardMaterial />
        </mesh>
      </Sandbox3D>
    );
    expect(screen.getByTestId('test-mesh')).toBeDefined();
  });
});

describe('SurfaceMesh', () => {
  const createTestGeometry = () => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setIndex([0, 1, 2]);
    return geo;
  };

  test('renders with geometry', () => {
    const geo = createTestGeometry();
    const { container } = render(<SurfaceMesh geometry={geo} />);
    expect(container.firstChild).toBeDefined();
  });

  test('renders with wireframe', () => {
    const geo = createTestGeometry();
    const { container } = render(<SurfaceMesh geometry={geo} wireframe />);
    expect(container.firstChild).toBeDefined();
  });
});
