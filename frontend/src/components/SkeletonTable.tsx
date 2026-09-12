export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="h-8 bg-gray-600 rounded w-full" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-6 bg-gray-700 rounded w-full" />
      ))}
    </div>
  );
}
