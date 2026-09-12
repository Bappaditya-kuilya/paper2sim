interface TextProps { children: React.ReactNode; size?: 'sm' | 'md' | 'lg' | 'xl'; color?: string; className?: string; }
export function Text({ children, size = 'md', color = 'text-gray-300', className = '' }: TextProps) {
  const sizes = { sm: 'text-sm', md: 'text-base', lg: 'text-lg', xl: 'text-xl' };
  return <p className={`${sizes[size]} ${color} ${className}`}>{children}</p>;
}
