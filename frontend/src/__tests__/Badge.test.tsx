import { render, screen } from '@testing-library/react';
import { Badge } from '../components/Badge';
describe('Badge', () => {
  it('renders label', () => { render(<Badge label="test" />); expect(screen.getByText('test')).toBeInTheDocument(); });
});
