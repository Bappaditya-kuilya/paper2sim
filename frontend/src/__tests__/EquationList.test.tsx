import { render, screen } from '@testing-library/react'
import { EquationList } from '../components/EquationList'

test('renders grid of cards', () => {
  const equations = [
    { latex: 'a', type: 'eq' },
    { latex: 'b', type: 'eq' },
  ]
  render(<EquationList equations={equations} loading={false} onSelect={() => {}} />)
  expect(screen.getByText('a')).toBeDefined()
  expect(screen.getByText('b')).toBeDefined()
})

test('shows empty state', () => {
  render(<EquationList equations={[]} loading={false} onSelect={() => {}} />)
  expect(screen.getByText('No equations extracted yet')).toBeDefined()
})

test('shows skeleton when loading', () => {
  const { container } = render(<EquationList equations={[]} loading={true} onSelect={() => {}} />)
  const skeletons = container.querySelectorAll('.animate-pulse')
  expect(skeletons.length).toBe(6)
})
