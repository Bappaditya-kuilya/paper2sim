import { render } from '@testing-library/react';
import { Divider } from '../components/Divider';
describe('Divider', () => {
  it('renders hr element', () => { const { container } = render(<Divider />); expect(container.querySelector('hr')).toBeInTheDocument(); });
});
