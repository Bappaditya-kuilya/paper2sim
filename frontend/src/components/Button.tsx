interface ButtonProps { children: React.ReactNode; onClick?: () => void; variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean; loading?: boolean; }
export function Button({ children, onClick, variant = 'primary', disabled, loading }: ButtonProps) {
  const colors = { primary: 'bg-blue-600 hover:bg-blue-700', secondary: 'bg-gray-600 hover:bg-gray-500', danger: 'bg-red-600 hover:bg-red-700' };
  return (<button onClick={onClick} disabled={disabled || loading} className={`px-4 py-2 rounded-lg text-white transition-colors disabled:opacity-50 ${colors[variant]}`}>
    {loading ? 'Loading...' : children}
  </button>);
}
