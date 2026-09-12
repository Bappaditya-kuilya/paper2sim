interface PaginationProps { page: number; total: number; onPageChange: (page: number) => void; }
export function Pagination({ page, total, onPageChange }: PaginationProps) {
  const pages = Math.ceil(total / 10);
  if (pages <= 1) return null;
  return (
    <div className="flex gap-2 justify-center mt-4">
      {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
        <button key={p} onClick={() => onPageChange(p)} className={`px-3 py-1 rounded ${p === page ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{p}</button>
      ))}
    </div>
  );
}
