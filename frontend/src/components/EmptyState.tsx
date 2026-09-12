interface EmptyStateProps { icon?: string; title: string; description: string; action?: React.ReactNode; }
export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-gray-400">
      {icon && <span className="text-4xl mb-4">{icon}</span>}
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm mb-4">{description}</p>
      {action}
    </div>
  );
}
