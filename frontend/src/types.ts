export interface Equation {
  latex: string;
  type: string;
  template?: string;
  label?: string;
}

export interface ExtractResponse {
  equations: Equation[];
  paper_info?: Record<string, unknown>;
}

export interface RenderJob {
  job_id: string;
  status: 'queued' | 'rendering' | 'complete' | 'failed';
  progress: number;
  error?: string;
  video_path?: string;
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
