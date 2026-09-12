interface EquationInputProps { value: string; onChange: (val: string) => void; placeholder?: string; }
export function EquationInput({ value, onChange, placeholder }: EquationInputProps) {
  return (
    <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder || 'Enter equation...'}
      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono" />
  );
}
