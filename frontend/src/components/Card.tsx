interface CardProps { children: React.ReactNode; className?: string; onClick?: () => void; }
export function Card({ children, className = '', onClick }: CardProps) {
  return (<div onClick={onClick} className={`bg-gray-800 border border-gray-700 rounded-lg p-4 ${onClick ? 'cursor-pointer hover:border-gray-500' : ''} ${className}`}>
    {children}
  </div>);
}
