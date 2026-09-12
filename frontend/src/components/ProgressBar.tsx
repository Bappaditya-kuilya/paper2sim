interface ProgressBarProps { value: number; max?: number; color?: string; showLabel?: boolean; }
export function ProgressBar({ value, max = 100, color = 'bg-blue-500', showLabel = true }: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className="w-full">
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-300`} style={{ width: `${pct}%` }} />
      </div>
      {showLabel && <span className="text-xs text-gray-400 mt-1">{Math.round(pct)}%</span>}
    </div>
  );
}
