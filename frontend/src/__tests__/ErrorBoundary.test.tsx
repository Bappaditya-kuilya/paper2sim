import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
const BadComponent = () => { throw new Error('Test error'); };
describe('ErrorBoundary', () => {
  it('renders children when no error', () => { render(<ErrorBoundary><div>Safe</div></ErrorBoundary>); expect(screen.getByText('Safe')).toBeInTheDocument(); });
  it('renders fallback on error', () => { render(<ErrorBoundary><BadComponent /></ErrorBoundary>); expect(screen.getByText('Something went wrong')).toBeInTheDocument(); });
});
