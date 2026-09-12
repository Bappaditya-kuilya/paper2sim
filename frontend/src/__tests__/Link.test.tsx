import { render, screen } from '@testing-library/react';
import { Link } from '../components/Link';
describe('Link', () => {
  it('renders text', () => { render(<Link href="/test">Click</Link>); expect(screen.getByText('Click')).toBeInTheDocument(); });
  it('opens in new tab when external', () => { render(<Link href="https://example.com" external>Link</Link>); expect(screen.getByText('Link')).toHaveAttribute('target', '_blank'); });
});
