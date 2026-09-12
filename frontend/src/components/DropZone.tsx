import { useState } from 'react';
import type { DragEvent } from 'react';
interface DropZoneProps { onDrop: (file: File) => void; accept?: string; children: React.ReactNode; }
export function DropZone({ onDrop, children }: DropZoneProps) {
  const [dragging, setDragging] = useState(false);
  const handleDrag = (e: DragEvent, over: boolean) => { e.preventDefault(); setDragging(over); };
  const handleDrop = (e: DragEvent) => { e.preventDefault(); setDragging(false); const file = e.dataTransfer.files[0]; if (file) onDrop(file); };
  return (
    <div onDragOver={(e) => handleDrag(e, true)} onDragLeave={(e) => handleDrag(e, false)} onDrop={handleDrop}
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragging ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`}>
      {children}
    </div>
  );
}
