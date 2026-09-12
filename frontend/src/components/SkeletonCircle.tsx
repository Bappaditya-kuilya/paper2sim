export function SkeletonCircle({ size = 40 }: { size?: number }) {
  return <div className="animate-pulse rounded-full bg-gray-600" style={{ width: size, height: size }} />;
}
