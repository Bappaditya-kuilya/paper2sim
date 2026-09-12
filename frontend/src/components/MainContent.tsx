import type { ReactNode } from 'react'

interface MainContentProps {
  children: ReactNode
}

export function MainContent({ children }: MainContentProps) {
  return (
    <main className="flex-1 overflow-y-auto bg-zinc-900 p-4 md:p-6 lg:p-8">
      {children}
    </main>
  )
}
