interface HeadingProps { children: React.ReactNode; level?: 1 | 2 | 3 | 4; className?: string; }
export function Heading({ children, level = 2, className = '' }: HeadingProps) {
  const sizes = { 1: 'text-2xl', 2: 'text-xl', 3: 'text-lg', 4: 'text-base' };
  const cls = `font-bold text-white ${sizes[level]} ${className}`;
  if (level === 1) return <h1 className={cls}>{children}</h1>;
  if (level === 2) return <h2 className={cls}>{children}</h2>;
  if (level === 3) return <h3 className={cls}>{children}</h3>;
  return <h4 className={cls}>{children}</h4>;
}
