import { render, screen, fireEvent } from '@testing-library/react';
import { Tabs } from '../components/Tabs';
describe('Tabs', () => {
  const tabs = [{ label: 'Tab 1', content: <div>Content 1</div> }, { label: 'Tab 2', content: <div>Content 2</div> }];
  it('renders first tab', () => { render(<Tabs tabs={tabs} />); expect(screen.getByText('Content 1')).toBeInTheDocument(); });
  it('switches tab on click', () => { render(<Tabs tabs={tabs} />); fireEvent.click(screen.getByText('Tab 2')); expect(screen.getByText('Content 2')).toBeInTheDocument(); });
});
