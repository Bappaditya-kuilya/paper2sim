import { useState } from 'react';
interface SearchBarProps { onSearch: (query: string) => void; placeholder?: string; }
export function SearchBar({ onSearch, placeholder }: SearchBarProps) {
  const [query, setQuery] = useState('');
  return (
    <div className="relative">
      <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onSearch(query)}
        placeholder={placeholder || 'Search equations...'} className="w-full px-4 py-2 pl-10 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500" />
      <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );
}
