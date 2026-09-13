import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { SearchFilter, useUrlState } from '../components/ui/SearchFilter';
import { renderHook, act } from '@testing-library/react';

describe('SearchFilter', () => {
  test('renders search input', () => {
    render(<SearchFilter />);
    expect(screen.getByPlaceholderText('Search equations...')).toBeDefined();
  });

  test('calls onSearch when typing', () => {
    const onSearch = vi.fn();
    render(<SearchFilter onSearch={onSearch} />);
    fireEvent.change(screen.getByPlaceholderText('Search equations...'), {
      target: { value: 'sin' },
    });
    expect(onSearch).toHaveBeenCalledWith('sin');
  });

  test('renders type filter buttons', () => {
    render(<SearchFilter />);
    expect(screen.getByText('All')).toBeDefined();
    expect(screen.getByText('trigonometric')).toBeDefined();
    expect(screen.getByText('polynomial')).toBeDefined();
  });

  test('calls onTypeFilter when type clicked', () => {
    const onTypeFilter = vi.fn();
    render(<SearchFilter onTypeFilter={onTypeFilter} />);
    fireEvent.click(screen.getByText('polynomial'));
    expect(onTypeFilter).toHaveBeenCalledWith('polynomial');
  });

  test('calls onTypeFilter with null when All clicked', () => {
    const onTypeFilter = vi.fn();
    render(<SearchFilter onTypeFilter={onTypeFilter} />);
    fireEvent.click(screen.getByText('All'));
    expect(onTypeFilter).toHaveBeenCalledWith(null);
  });

  test('highlights active type', () => {
    render(<SearchFilter activeType="polynomial" />);
    const btn = screen.getByText('polynomial');
    expect(btn.className).toContain('bg-blue-500/20');
  });
});

describe('useUrlState', () => {
  test('returns default value when no URL param', () => {
    const { result } = renderHook(() => useUrlState('test', 'default'));
    expect(result.current[0]).toBe('default');
  });

  test('updates value and URL', () => {
    const { result } = renderHook(() => useUrlState('test', 'default'));
    act(() => {
      result.current[1]('new value');
    });
    expect(result.current[0]).toBe('new value');
  });
});
