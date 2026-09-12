import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '../components/SearchBar';
describe('SearchBar', () => {
  it('renders input', () => { render(<SearchBar onSearch={() => {}} />); expect(screen.getByPlaceholderText('Search equations...')).toBeInTheDocument(); });
  it('calls onSearch on Enter', () => { const onSearch = vi.fn(); render(<SearchBar onSearch={onSearch} />); fireEvent.keyDown(screen.getByPlaceholderText('Search equations...'), { key: 'Enter' }); expect(onSearch).toHaveBeenCalled(); });
});
