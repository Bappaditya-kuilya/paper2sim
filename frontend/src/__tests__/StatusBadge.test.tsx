import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../components/StatusBadge';
describe('StatusBadge', () => {
  it('shows status label', () => { render(<StatusBadge status="success" />); expect(screen.getByText('Done')).toBeInTheDocument(); });
  it('shows custom label', () => { render(<StatusBadge status="loading" label="Processing" />); expect(screen.getByText('Processing')).toBeInTheDocument(); });
});
