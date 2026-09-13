import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  ErrorRetry,
  OfflineBanner,
  DarkModeToggle,
  ComparisonMode,
  Favorites,
  RecentHistory,
} from '../components/ui/UtilityComponents';

describe('ErrorRetry', () => {
  test('renders error message', () => {
    render(<ErrorRetry error="Something failed" />);
    expect(screen.getByText('Something failed')).toBeDefined();
  });

  test('shows retry button when onRetry provided', () => {
    const onRetry = vi.fn();
    render(<ErrorRetry error="Failed" onRetry={onRetry} />);
    expect(screen.getByText(/Retry/)).toBeDefined();
  });

  test('calls onRetry when clicked', () => {
    const onRetry = vi.fn();
    render(<ErrorRetry error="Failed" onRetry={onRetry} retryCount={0} />);
    fireEvent.click(screen.getByText(/Retry/));
    expect(onRetry).toHaveBeenCalled();
  });

  test('hides retry when max retries reached', () => {
    render(<ErrorRetry error="Failed" onRetry={vi.fn()} retryCount={3} maxRetries={3} />);
    expect(screen.queryByText(/Retry/)).toBeNull();
  });
});

describe('OfflineBanner', () => {
  test('renders nothing when online', () => {
    const { container } = render(<OfflineBanner isOffline={false} />);
    expect(container.firstChild).toBeNull();
  });

  test('renders when offline', () => {
    render(<OfflineBanner isOffline={true} />);
    expect(screen.getByText("You're offline")).toBeDefined();
  });

  test('calls onReconnect when clicked', () => {
    const onReconnect = vi.fn();
    render(<OfflineBanner isOffline={true} onReconnect={onReconnect} />);
    fireEvent.click(screen.getByText('Try Reconnecting'));
    expect(onReconnect).toHaveBeenCalled();
  });
});

describe('DarkModeToggle', () => {
  test('renders sun icon in dark mode', () => {
    render(<DarkModeToggle isDark={true} />);
    expect(screen.getByTitle('Switch to light mode')).toBeDefined();
  });

  test('renders moon icon in light mode', () => {
    render(<DarkModeToggle isDark={false} />);
    expect(screen.getByTitle('Switch to dark mode')).toBeDefined();
  });

  test('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<DarkModeToggle onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalled();
  });
});

describe('ComparisonMode', () => {
  test('renders compare button', () => {
    render(<ComparisonMode />);
    expect(screen.getByText('Compare Equations')).toBeDefined();
  });

  test('calls onToggle when clicked', () => {
    const onToggle = vi.fn();
    render(<ComparisonMode onToggle={onToggle} />);
    fireEvent.click(screen.getByText('Compare Equations'));
    expect(onToggle).toHaveBeenCalled();
  });

  test('shows equation list when enabled', () => {
    const equations = [
      { id: '1', latex: 'y = x' },
      { id: '2', latex: 'y = x^2' },
    ];
    render(<ComparisonMode isEnabled equations={equations} />);
    expect(screen.getByText('y = x')).toBeDefined();
    expect(screen.getByText('y = x^2')).toBeDefined();
  });

  test('highlights selected equations', () => {
    const equations = [{ id: '1', latex: 'y = x' }];
    render(<ComparisonMode isEnabled equations={equations} selectedIds={['1']} />);
    expect(screen.getByText('y = x').className).toContain('bg-purple-500/20');
  });
});

describe('Favorites', () => {
  test('renders nothing when empty', () => {
    const { container } = render(<Favorites />);
    expect(container.firstChild).toBeNull();
  });

  test('renders favorite equations', () => {
    const equations = [
      { id: '1', latex: 'y = x' },
      { id: '2', latex: 'y = x^2' },
    ];
    render(<Favorites favorites={['1']} equations={equations} />);
    expect(screen.getByText('Favorites')).toBeDefined();
    expect(screen.getByText('y = x')).toBeDefined();
  });

  test('calls onToggle when star clicked', () => {
    const onToggle = vi.fn();
    const equations = [{ id: '1', latex: 'y = x' }];
    render(<Favorites favorites={['1']} equations={equations} onToggle={onToggle} />);
    fireEvent.click(screen.getByText('★'));
    expect(onToggle).toHaveBeenCalledWith('1');
  });
});

describe('RecentHistory', () => {
  test('renders nothing when empty', () => {
    const { container } = render(<RecentHistory />);
    expect(container.firstChild).toBeNull();
  });

  test('renders recent items', () => {
    const history = [
      { id: '1', latex: 'y = x', timestamp: Date.now() },
      { id: '2', latex: 'y = x^2', timestamp: Date.now() },
    ];
    render(<RecentHistory history={history} />);
    expect(screen.getByText('Recent')).toBeDefined();
    expect(screen.getByText('y = x')).toBeDefined();
  });

  test('calls onSelect when item clicked', () => {
    const onSelect = vi.fn();
    const history = [{ id: '1', latex: 'y = x', timestamp: Date.now() }];
    render(<RecentHistory history={history} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('y = x'));
    expect(onSelect).toHaveBeenCalledWith('1');
  });

  test('limits items to maxItems', () => {
    const history = [
      { id: '1', latex: 'y = x', timestamp: Date.now() },
      { id: '2', latex: 'y = x^2', timestamp: Date.now() },
      { id: '3', latex: 'y = x^3', timestamp: Date.now() },
    ];
    render(<RecentHistory history={history} maxItems={2} />);
    expect(screen.getByText('y = x')).toBeDefined();
    expect(screen.getByText('y = x^2')).toBeDefined();
    expect(screen.queryByText('y = x^3')).toBeNull();
  });
});
