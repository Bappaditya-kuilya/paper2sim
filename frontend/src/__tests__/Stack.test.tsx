import { render } from '@testing-library/react';
import { Stack } from '../components/Stack';
describe('Stack', () => {
  it('renders children', () => { const { container } = render(<Stack><div>A</div><div>B</div></Stack>); expect(container.textContent).toBe('AB'); });
});
