import { render, screen } from '@testing-library/react';
import { Avatar } from '../components/Avatar';
describe('Avatar', () => {
  it('shows initials', () => { render(<Avatar name="John Doe" />); expect(screen.getByText('JD')).toBeInTheDocument(); });
});
