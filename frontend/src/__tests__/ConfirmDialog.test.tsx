import { render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../components/ConfirmDialog';
describe('ConfirmDialog', () => {
  it('renders when open', () => { render(<ConfirmDialog open title="Delete?" message="Are you sure?" onConfirm={() => {}} onCancel={() => {}} />); expect(screen.getByText('Delete?')).toBeInTheDocument(); });
  it('does not render when closed', () => { render(<ConfirmDialog open={false} title="T" message="M" onConfirm={() => {}} onCancel={() => {}} />); expect(screen.queryByText('T')).not.toBeInTheDocument(); });
  it('calls onConfirm', () => { const fn = vi.fn(); render(<ConfirmDialog open title="T" message="M" onConfirm={fn} onCancel={() => {}} />); fireEvent.click(screen.getByText('Confirm')); expect(fn).toHaveBeenCalled(); });
});
