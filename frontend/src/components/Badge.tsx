interface BadgeProps { label: string; color?: string; }
export function Badge({ label, color = 'bg-gray-600' }: BadgeProps) {
  return <span className={`px-2 py-1 text-xs rounded-full text-white ${color}`}>{label}</span>;
}
