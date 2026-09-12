import { useEffect, useRef } from 'react';

interface ModalProps { open: boolean; onClose: () => void; title: string; children: React.ReactNode; }

export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (open) ref.current?.showModal(); else ref.current?.close(); }, [open]);
  return (<dialog ref={ref} onClose={onClose} className="bg-gray-800 text-white rounded-lg p-6 backdrop:bg-black/50">
    <h2 className="text-lg font-bold mb-4">{title}</h2>{children}
    <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-600 rounded">Close</button>
  </dialog>);
}