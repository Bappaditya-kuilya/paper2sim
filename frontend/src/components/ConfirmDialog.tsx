interface ConfirmDialogProps { open: boolean; title: string; message: string; onConfirm: () => void; onCancel: () => void; }
export function ConfirmDialog({ open, title, message, onConfirm, onCancel }: ConfirmDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-4 py-2 bg-gray-600 rounded text-white">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 bg-red-600 rounded text-white">Confirm</button>
        </div>
      </div>
    </div>
  );
}
