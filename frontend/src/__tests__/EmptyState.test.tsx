import { render, screen } from '@testing-library/react';
import { EmptyState } from '../components/EmptyState';
describe('EmptyState', () => {
  it('renders title and description', () => { render(<EmptyState title="No results" description="Try again" />); expect(screen.getByText('No results')).toBeInTheDocument(); expect(screen.getByText('Try again')).toBeInTheDocument(); });
});
