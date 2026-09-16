import { normalizeInput } from '../lib/mathParser';
import { defaultFreeParams, expandGluedX } from '../lib/plotMeta';
import { GenericSurface } from './sandbox/GenericSurface';
import { Sandbox3D } from './sandbox/Sandbox3D';

export interface Viewer3DProps {
  latex: string;
  xRange: [number, number];
  yRange: [number, number];
  resolution: number;
  showGrid: boolean;
  showAxes: boolean;
  wireframe: boolean;
}

// Thin adapter over Sandbox3D + GenericSurface (reuse, not a copy): maps Viewer
// props onto their props 1:1, normalizing LaTeX to a mathjs expression first
// (same normalizeInput the 2D plot uses). Owns no 3D logic itself.
export function Viewer3D({
  latex,
  xRange,
  yRange,
  resolution,
  showGrid,
  showAxes,
  wireframe,
}: Viewer3DProps) {
  // Same free-param defaults as Plot2D (k=1, ...), so 2D and 3D agree.
  // GenericSurface compiles with {x}/{x,y} scope only, hence string substitution.
  // expandGluedX first: mx+c and 2x must expand identically in both renderers.
  const expression = defaultFreeParams(expandGluedX(normalizeInput(latex)));
  return (
    <div data-testid="viewer-3d" className="h-[280px] w-full md:h-[400px]" aria-label={`3D plot of ${latex}. Drag to rotate.`}>
      <Sandbox3D gridVisible={showGrid} axesVisible={showAxes}>
        <GenericSurface
          expression={expression}
          xRange={xRange}
          yRange={yRange}
          resolution={resolution}
          wireframe={wireframe}
        />
      </Sandbox3D>
    </div>
  );
}
