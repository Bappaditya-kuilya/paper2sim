export interface RowParam {
  value: number;
  min: number;
  max: number;
  step: number;
}

export interface Row {
  id: string;
  latex: string;
  color: string;
  visible: boolean;
  params: Record<string, RowParam>;
}

export const PALETTE: string[] = ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'];

export function newRow(latex: string, color: string): Row {
  return { id: crypto.randomUUID(), latex, color, visible: true, params: {} };
}

export function toggleRow(r: Row): Row {
  return { ...r, visible: !r.visible };
}

export function duplicateRow(r: Row): Row {
  return { ...r, params: { ...r.params }, id: crypto.randomUUID() };
}
