interface StackProps { children: React.ReactNode; gap?: number; direction?: 'vertical' | 'horizontal'; }
export function Stack({ children, gap = 4, direction = 'vertical' }: StackProps) {
  const dir = direction === 'horizontal' ? 'flex-row' : 'flex-col';
  return <div className={`flex ${dir}`} style={{ gap: `${gap * 0.25}rem` }}>{children}</div>;
}
