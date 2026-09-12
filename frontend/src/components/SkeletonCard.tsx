export function SkeletonCard() {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 animate-pulse">
      <div className="h-4 bg-gray-600 rounded w-3/4 mb-2" />
      <div className="h-3 bg-gray-600 rounded w-1/2 mb-4" />
      <div className="h-20 bg-gray-600 rounded" />
    </div>
  );
}
