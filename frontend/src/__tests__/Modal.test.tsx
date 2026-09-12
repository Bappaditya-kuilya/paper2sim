import { render, screen } from '@testing-library/react';
import { Modal } from '../components/Modal';
describe('Modal', () => {
  it('renders title when open', () => { render(<Modal open={true} onClose={() => {}} title="Test Title">Content</Modal>); expect(screen.getByText('Test Title')).toBeInTheDocument(); });
  it('renders children', () => { render(<Modal open={true} onClose={() => {}} title="T">Child content</Modal>); expect(screen.getByText('Child content')).toBeInTheDocument(); });
});
