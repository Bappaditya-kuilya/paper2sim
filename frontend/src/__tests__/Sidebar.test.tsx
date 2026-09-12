import { render, screen } from '@testing-library/react'
import { Sidebar } from '../components/Sidebar'

test('renders nav items', () => {
  render(<Sidebar />)
  expect(screen.getByText('Extract')).toBeDefined()
  expect(screen.getByText('Render')).toBeDefined()
  expect(screen.getByText('Settings')).toBeDefined()
})

test('highlights active item', () => {
  render(<Sidebar activeItem="render" />)
  const renderBtn = screen.getByText('Render').closest('button')!
  expect(renderBtn.className).toContain('bg-zinc-800')
})
