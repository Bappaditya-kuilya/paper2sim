import React from 'react';
import { TrigSurface } from './TrigSurface';
import { PolySurface } from './PolySurface';
import { ExpSurface } from './ExpSurface';
import { LogSurface } from './LogSurface';
import { GenericSurface } from './GenericSurface';

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

export function selectRenderer(modelType: string): React.FC<any> { // eslint-disable-line react/only-export-components
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

  return <Renderer {...rendererProps} />; // eslint-disable-line react/static-components
}
