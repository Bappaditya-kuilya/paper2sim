export interface ViewerParams {
  xRange: [number, number];
  yRange: [number, number];
  resolution: number;
  showGrid: boolean;
  showAxes: boolean;
  wireframe: boolean;
}

export type ParamPatch = Partial<ViewerParams>;

export const DEFAULT_VIEWER_PARAMS: ViewerParams = {
  xRange: [-10, 10],
  yRange: [-10, 10],
  resolution: 48,
  showGrid: true,
  showAxes: true,
  wireframe: true,
};
