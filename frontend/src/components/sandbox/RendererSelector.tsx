import React from 'react';
import { TrigSurface, TrigSurfaceProps } from './TrigSurface';
import { PolySurface, PolySurfaceProps } from './PolySurface';
import { ExpSurface, ExpSurfaceProps } from './ExpSurface';
import { LogSurface, LogSurfaceProps } from './LogSurface';
import { GenericSurface, GenericSurfaceProps, ParametricSurface, ParametricSurfaceProps } from './GenericSurface';

export interface RendererProps {
  expression: string;
  modelType: string;
  xRange?: [number, number];
  yRange?: [number, number];
  resolution?: number;
  wireframe?: boolean;
  coefficients?: number[];
  base?: number;
  uRange?: [number, number];
  vRange?: [number, number];
}

export function selectRenderer(modelType: string): React.FC<any> {
  switch (modelType) {
    case 'trigonometric':
      return TrigSurface;
    case 'polynomial':
      return PolySurface;
    case 'exponential':
      return ExpSurface;
    case 'logarithmic':
      return LogSurface;
    default:
      return GenericSurface;
  }
}

export function MathSurface({ expression, modelType, ...props }: RendererProps) {
  const Renderer = selectRenderer(modelType);

  const rendererProps: any = { expression, ...props };

  if (modelType === 'polynomial' && props.coefficients) {
    rendererProps.coefficients = props.coefficients;
  }

  if (modelType === 'exponential' && props.base) {
    rendererProps.base = props.base;
  }

  if (modelType === 'logarithmic' && props.base) {
    rendererProps.base = props.base;
  }

  return <Renderer {...rendererProps} />;
}
