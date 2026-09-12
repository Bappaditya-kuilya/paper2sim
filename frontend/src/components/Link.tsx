interface LinkProps { href: string; children: React.ReactNode; external?: boolean; }
export function Link({ href, children, external }: LinkProps) {
  return <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noopener noreferrer' : undefined} className="text-blue-400 hover:text-blue-300 underline">{children}</a>;
}
