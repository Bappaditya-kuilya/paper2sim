import { render, screen } from '@testing-library/react';
import { ProgressBar } from '../components/ProgressBar';
describe('ProgressBar', () => {
  it('renders percentage', () => { render(<ProgressBar value={50} />); expect(screen.getByText('50%')).toBeInTheDocument(); });
  it('clamps to 100', () => { render(<ProgressBar value={150} />); expect(screen.getByText('100%')).toBeInTheDocument(); });
});
