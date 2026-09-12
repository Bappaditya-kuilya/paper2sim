interface HeaderProps {
  mobileOpen?: boolean
  onToggleMobile?: () => void
}

export function Header({ mobileOpen = false, onToggleMobile }: HeaderProps) {
  return (
    <header aria-label="Paper2Sim header" className="sticky top-0 z-50 flex items-center justify-between border-b border-zinc-800 bg-zinc-950 px-4 py-3 md:px-6">
      <div className="flex items-center gap-3">
        <button
          className="md:hidden text-zinc-400 hover:text-zinc-100"
          onClick={onToggleMobile}
          aria-label="Toggle menu"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
        <span aria-label="Home" className="text-lg font-semibold text-zinc-100 tracking-tight">Paper2Sim</span>
      </div>
      <nav className="hidden md:flex items-center gap-4 text-sm text-zinc-400">
        <a href="#" className="hover:text-zinc-100 transition-colors">Docs</a>
        <a href="#" className="hover:text-zinc-100 transition-colors">GitHub</a>
      </nav>
    </header>
  )
}
