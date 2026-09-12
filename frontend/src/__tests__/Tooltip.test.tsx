import { render, screen } from '@testing-library/react';
import { Tooltip } from '../components/Tooltip';
describe('Tooltip', () => {
  it('renders children', () => { render(<Tooltip content="tip"><button>Hover</button></Tooltip>); expect(screen.getByText('Hover')).toBeInTheDocument(); });
});
