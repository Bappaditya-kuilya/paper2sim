import { render, screen } from '@testing-library/react';
import { Card } from '../components/Card';
describe('Card', () => {
  it('renders children', () => { render(<Card>Content</Card>); expect(screen.getByText('Content')).toBeInTheDocument(); });
  it('has cursor-pointer when onClick provided', () => { render(<Card onClick={() => {}}>Clickable</Card>); expect(screen.getByText('Clickable')).toHaveClass('cursor-pointer'); });
});
