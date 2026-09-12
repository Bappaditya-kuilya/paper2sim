interface ChipProps { label: string; onRemove?: () => void; color?: string; }
export function Chip({ label, onRemove, color = 'bg-gray-600' }: ChipProps) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${color}`}>
      {label}
      {onRemove && <button onClick={onRemove} className="ml-1 hover:text-gray-300">&times;</button>}
    </span>
  );
}
