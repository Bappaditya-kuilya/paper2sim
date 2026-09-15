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
