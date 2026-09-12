import { render } from '@testing-library/react';
import { Spinner } from '../components/Spinner';
describe('Spinner', () => {
  it('renders without crashing', () => { const { container } = render(<Spinner />); expect(container.firstChild).toBeTruthy(); });
  it('applies size class', () => { const { container } = render(<Spinner size="lg" />); expect(container.firstChild).toHaveClass('h-12'); });
});
