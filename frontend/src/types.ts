export interface Equation {
  latex: string;
  type: string;
  template?: string;
  label?: string;
  vizMode?: '3d' | 'info';
}

export interface ExtractResponse {
  equations: Equation[];
  paper_info?: Record<string, unknown>;
}

export interface BreakdownResponse {
  breakdowns: Array<{
    latex: string;
    name?: string;
    explanation: string;
    variables: Record<string, string>;
    visualization_hint: string;
  }>;
  error?: string;
}

// Pipeline job (GET /api/jobs/{id}) — mirrors backend JobRecord.
export interface Job {
  id: string;
  title: string;
  status: 'queued' | 'ingesting' | 'analyzing' | 'generating' | 'executing' | 'repairing' | 'summarizing' | 'completed' | 'failed';
  source_kind?: string;
  llm_provider?: string;
  paper_excerpt?: string;
  analysis?: { claim: string; why_it_matters: string; simulation_plan: string; viz_type: string } | null;
  code?: string;
  execution?: {
    returncode: number; stdout: string; stderr: string; duration_seconds: number;
    artifacts: string[]; result_json: { metrics?: Record<string, unknown>; verdict?: string; explanation?: string } | null;
    attempt: number; timed_out: boolean;
  } | null;
  scene?: Scene | null;
  artifacts?: string[];
  verdict?: string;
  summary?: string;
  error?: string | null;
}

export interface JobListItem {
  id: string;
  title: string;
  status: string;
  verdict: string;
  created_at: string;
}

// scene.json contract (PRD §7) — the one coupling sandbox → React 3D layer.
export type SceneType =
  | 'trigonometric' | 'polynomial' | 'exponential' | 'logarithmic' | 'hyperbolic'
  | 'matrix' | 'probability' | 'statistical' | 'ode' | 'physics' | 'generic' | 'trajectory';

export interface Scene {
  type: SceneType;
  expression: string;
  coefficients?: number[];
  x_range: [number, number];
  y_range: [number, number];
  resolution: number;
  extra?: {
    trajectory?: Array<[number, number, number]>;
    vectors?: Array<{ origin: [number, number, number]; dir: [number, number, number] }>;
  };
}
