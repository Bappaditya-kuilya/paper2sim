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

export const PALETTE: string[] = ['#FFFFFF', '#D1D5DB', '#9CA3AF', '#6B7280'];

export const RAMP: string[] = PALETTE;

export const DASH_CYCLE: string[] = ['', '6 3', '2 3', '8 3 2 3'];

export function newRow(latex: string, color: string): Row {
  return { id: crypto.randomUUID(), latex, color, visible: true, params: {} };
}

export function toggleRow(r: Row): Row {
  return { ...r, visible: !r.visible };
}

export function duplicateRow(r: Row): Row {
  return { ...r, params: { ...r.params }, id: crypto.randomUUID() };
}
