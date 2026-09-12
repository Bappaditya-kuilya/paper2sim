import { render, screen } from '@testing-library/react';
import { Button } from '../components/Button';
describe('Button', () => {
  it('renders children', () => { render(<Button>Click me</Button>); expect(screen.getByText('Click me')).toBeInTheDocument(); });
  it('is disabled when disabled prop is true', () => { render(<Button disabled>Click</Button>); expect(screen.getByRole('button')).toBeDisabled(); });
  it('shows loading text', () => { render(<Button loading>Click</Button>); expect(screen.getByText('Loading...')).toBeInTheDocument(); });
});
