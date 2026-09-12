interface AvatarProps { name: string; size?: 'sm' | 'md' | 'lg'; }
export function Avatar({ name, size = 'md' }: AvatarProps) {
  const sizes = { sm: 'h-6 w-6 text-xs', md: 'h-8 w-8 text-sm', lg: 'h-12 w-12 text-lg' };
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  return <div className={`${sizes[size]} rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold`}>{initials}</div>;
}
