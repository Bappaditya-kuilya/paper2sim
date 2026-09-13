import React, { useState, useCallback, useEffect } from 'react';

export interface SearchFilterProps {
  onSearch?: (query: string) => void;
  onTypeFilter?: (type: string | null) => void;
  activeType?: string | null;
  types?: string[];
}

export function SearchFilter({
  onSearch,
  onTypeFilter,
  activeType,
  types = [
    'trigonometric',
    'polynomial',
    'exponential',
    'logarithmic',
    'ode',
    'physics',
    'matrix',
    'probability',
    'function',
  ],
}: SearchFilterProps) {
  const [query, setQuery] = useState('');

  const handleSearch = useCallback(
    (value: string) => {
      setQuery(value);
      onSearch?.(value);
    },
    [onSearch]
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search equations..."
          className="w-full pl-9 pr-3 py-2 text-sm bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-200 placeholder-zinc-500"
        />
      </div>

      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => onTypeFilter?.(null)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            activeType === null
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              : 'text-zinc-400 hover:text-zinc-200 border border-zinc-700'
          }`}
        >
          All
        </button>
        {types.map((type) => (
          <button
            key={type}
            onClick={() => onTypeFilter?.(type)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              activeType === type
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-zinc-400 hover:text-zinc-200 border border-zinc-700'
            }`}
          >
            {type}
          </button>
        ))}
      </div>
    </div>
  );
}

export function useUrlState<T>(key: string, defaultValue: T): [T, (value: T) => void] {
  const [state, setState] = useState<T>(() => {
    const params = new URLSearchParams(window.location.search);
    const saved = params.get(key);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return saved as T;
      }
    }
    return defaultValue;
  });

  const setUrlState = useCallback(
    (value: T) => {
      setState(value);
      const params = new URLSearchParams(window.location.search);
      params.set(key, JSON.stringify(value));
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    },
    [key]
  );

  return [state, setUrlState];
}
