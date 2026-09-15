import React from 'react';
import { TrigSurface } from './TrigSurface';
import { PolySurface } from './PolySurface';
import { ExpSurface } from './ExpSurface';
import { LogSurface } from './LogSurface';
import { GenericSurface } from './GenericSurface';
import { MatrixVis } from './MatrixVis';
import { ProbDiagram } from './ProbDiagram';
import { DistChart } from './DistChart';
import { SlopeField } from './SlopeField';
import { ForceField } from './ForceField';

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
    case 'hyperbolic':
      return GenericSurface;
    case 'matrix':
      return MatrixVis;
    case 'probability':
      return ProbDiagram;
    case 'statistical':
      return DistChart;
    case 'ode':
      return SlopeField;
    case 'physics':
      return ForceField;
    default:
      return GenericSurface;
  }
}

// Adapters: derive structured props from raw latex with plain regexes
// (mathParser has no number/matrix helpers); anything unparseable falls
// back to each component's own documented defaults.
function parseMatrix(latex: string): number[][] | undefined {
  const body = latex.match(/\\begin\{[^}]*\}([\s\S]*?)\\end\{[^}]*\}/)?.[1];
  if (!body) return undefined;
  const rows = body
    .split(/\\\\/)
    .map((r) => r.trim())
    .filter(Boolean)
    .map((r) =>
      r.split(/&/).map((c) => parseFloat(c.replace(/[^0-9eE.+-]/g, '')))
    );
  if (!rows.length || rows.some((r) => !r.length || r.some((n) => !isFinite(n)))) return undefined;
  if (!rows.every((r) => r.length === rows[0].length)) return undefined;
  return rows;
}

function numbersIn(latex: string): number[] {
  return (latex.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number).filter(isFinite);
}

function distType(latex: string): 'gaussian' | 'binomial' | 'poisson' | 'uniform' {
  const s = latex.toLowerCase();
  if (s.includes('binomial')) return 'binomial';
  if (s.includes('poisson')) return 'poisson';
  if (s.includes('uniform')) return 'uniform';
  return 'gaussian';
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

  if (modelType === 'matrix') {
    const matrix = parseMatrix(expression);
    if (matrix) rendererProps.matrix = matrix;
  }

  if (modelType === 'probability') {
    const nums = numbersIn(expression).filter((n) => n >= 0 && n <= 1);
    if (nums[0] !== undefined) rendererProps.pA = nums[0];
    if (nums[1] !== undefined) rendererProps.pB = nums[1];
    if (nums[2] !== undefined) rendererProps.pAandB = nums[2];
    if (/(\||conditional|given)/i.test(expression)) rendererProps.showConditional = true;
  }

  if (modelType === 'statistical') {
    const type = distType(expression);
    const nums = numbersIn(expression);
    rendererProps.type = type;
    if (type === 'gaussian') {
      if (nums[0] !== undefined) rendererProps.mean = nums[0];
      if (nums[1] !== undefined && nums[1] > 0) rendererProps.std = nums[1];
    } else if (type === 'binomial') {
      if (nums[0] !== undefined) rendererProps.trials = Math.max(1, Math.round(nums[0]));
      if (nums[1] !== undefined) rendererProps.probability = Math.min(1, Math.max(0, nums[1]));
    } else if (type === 'poisson') {
      if (nums[0] !== undefined && nums[0] > 0) rendererProps.lambda = nums[0];
    }
  }

  if (modelType === 'physics') {
    const nums = numbersIn(expression);
    if (nums[0] !== undefined) rendererProps.mass = Math.abs(nums[0]) || undefined;
    if (nums[1] !== undefined) rendererProps.acceleration = Math.abs(nums[1]) || undefined;
  }

  return <Renderer {...rendererProps} />; // eslint-disable-line react/static-components
}
