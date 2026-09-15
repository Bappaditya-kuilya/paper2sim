import { render, screen } from '@testing-library/react'
import { EquationCard } from '../components/EquationCard'

test('renders latex text', () => {
  render(<EquationCard latex="E=mc^2" type="eq" onSelect={() => {}} />)
  expect(screen.getByText('E=mc^2')).toBeDefined()
})

test('shows type badge', () => {
  render(<EquationCard latex="x" type="differential" onSelect={() => {}} />)
  expect(screen.getByText('differential')).toBeDefined()
})

test('shows template badge when provided', () => {
  render(<EquationCard latex="x" type="eq" template="pendulum" onSelect={() => {}} />)
  expect(screen.getByText('pendulum')).toBeDefined()
})

test('hints interactive 3D when vizMode is 3d', () => {
  render(<EquationCard latex="x" type="eq" vizMode="3d" onSelect={() => {}} />)
  expect(screen.getByText('Opens interactive 3D')).toBeDefined()
})

test('hints equation details otherwise', () => {
  render(<EquationCard latex="x" type="eq" onSelect={() => {}} />)
  expect(screen.getByText('Opens equation details')).toBeDefined()
})
