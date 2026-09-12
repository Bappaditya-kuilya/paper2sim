import { render, screen } from '@testing-library/react';
import { CodeBlock } from '../components/CodeBlock';
describe('CodeBlock', () => {
  it('renders code', () => { render(<CodeBlock code="console.log('hi')" />); expect(screen.getByText("console.log('hi')")).toBeInTheDocument(); });
  it('shows language label', () => { render(<CodeBlock code="x" language="typescript" />); expect(screen.getByText('typescript')).toBeInTheDocument(); });
});
