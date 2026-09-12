import { render, screen } from '@testing-library/react'
import { ProgressTracker } from '../components/ProgressTracker'

test('renders step labels', () => {
  render(<ProgressTracker currentStep={0} steps={['Extract', 'Render']} />)
  expect(screen.getByText('Extract')).toBeDefined()
  expect(screen.getByText('Render')).toBeDefined()
})

test('highlights current step', () => {
  const { container } = render(<ProgressTracker currentStep={1} steps={['Extract', 'Render']} />)
  const rings = container.querySelectorAll('.ring-2')
  expect(rings.length).toBe(1)
})
