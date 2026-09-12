import { render, screen, fireEvent } from '@testing-library/react';
import { Chip } from '../components/Chip';
describe('Chip', () => {
  it('renders label', () => { render(<Chip label="test" />); expect(screen.getByText('test')).toBeInTheDocument(); });
  it('calls onRemove', () => { const fn = vi.fn(); render(<Chip label="x" onRemove={fn} />); fireEvent.click(screen.getByText('×')); expect(fn).toHaveBeenCalled(); });
});
