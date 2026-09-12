interface StatusBadgeProps { status: 'idle' | 'loading' | 'success' | 'error'; label?: string; }
export function StatusBadge({ status, label }: StatusBadgeProps) {
  const colors = { idle: 'bg-gray-600', loading: 'bg-yellow-600', success: 'bg-green-600', error: 'bg-red-600' };
  const labels = { idle: 'Idle', loading: 'Loading...', success: 'Done', error: 'Error' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs text-white ${colors[status]}`}>
      {status === 'loading' && <span className="animate-spin h-3 w-3 border border-white border-t-transparent rounded-full" />}
      {label || labels[status]}
    </span>
  );
}
