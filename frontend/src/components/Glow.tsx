interface GlowProps { color?: string; children: React.ReactNode; }
export function Glow({ color = 'blue', children }: GlowProps) {
  return <div className={`relative before:absolute before:inset-0 before:bg-${color}-500/20 before:blur-xl before:rounded-xl`}>{children}</div>;
}
