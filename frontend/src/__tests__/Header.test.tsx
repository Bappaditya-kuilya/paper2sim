import { render, screen } from '@testing-library/react'
import { Header } from '../components/Header'

test('renders Paper2Sim text', () => {
  render(<Header />)
  expect(screen.getByText('Paper2Sim')).toBeDefined()
})

test('has nav links', () => {
  render(<Header />)
  expect(screen.getByText('Docs')).toBeDefined()
  expect(screen.getByText('GitHub')).toBeDefined()
})
