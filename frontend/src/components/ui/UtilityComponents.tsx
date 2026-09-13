import React, { useState, useEffect } from 'react';

export interface ErrorRetryProps {
  error: string;
  onRetry?: () => void;
  maxRetries?: number;
  retryCount?: number;
}

export function ErrorRetry({
  error,
  onRetry,
  maxRetries = 3,
  retryCount = 0,
}: ErrorRetryProps) {
  const canRetry = retryCount < maxRetries;

  return (
    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <div className="flex-1">
          <p className="text-sm text-red-400">{error}</p>
          {onRetry && canRetry && (
            <button
              onClick={onRetry}
              className="mt-2 px-3 py-1 text-xs text-red-400 border border-red-500/30 rounded hover:bg-red-500/10"
            >
              Retry ({maxRetries - retryCount} left)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export interface OfflineBannerProps {
  isOffline?: boolean;
  onReconnect?: () => void;
}

export function OfflineBanner({ isOffline = false, onReconnect }: OfflineBannerProps) {
  if (!isOffline) return null;

  return (
    <div className="bg-yellow-500/10 border border-yellow-500/30 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <svg className="w-4 h-4 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.242 2.829a5 5 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3" />
        </svg>
        <span className="text-sm text-yellow-400">You're offline</span>
      </div>
      {onReconnect && (
        <button
          onClick={onReconnect}
          className="px-3 py-1 text-xs text-yellow-400 border border-yellow-500/30 rounded hover:bg-yellow-500/10"
        >
          Try Reconnecting
        </button>
      )}
    </div>
  );
}

export interface DarkModeToggleProps {
  isDark?: boolean;
  onToggle?: () => void;
}

export function DarkModeToggle({ isDark = true, onToggle }: DarkModeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="p-2 text-zinc-400 hover:text-zinc-200 rounded-lg hover:bg-zinc-800"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ) : (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )}
    </button>
  );
}

export interface ComparisonModeProps {
  isEnabled?: boolean;
  onToggle?: () => void;
  equations?: Array<{ id: string; latex: string }>;
  selectedIds?: string[];
  onSelect?: (id: string) => void;
}

export function ComparisonMode({
  isEnabled = false,
  onToggle,
  equations = [],
  selectedIds = [],
  onSelect,
}: ComparisonModeProps) {
  return (
    <div className="space-y-2">
      <button
        onClick={onToggle}
        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
          isEnabled
            ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
            : 'text-zinc-400 border border-zinc-700 hover:bg-zinc-800'
        }`}
      >
        {isEnabled ? 'Exit Comparison' : 'Compare Equations'}
      </button>

      {isEnabled && equations.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {equations.map((eq) => (
            <button
              key={eq.id}
              onClick={() => onSelect?.(eq.id)}
              className={`px-2 py-1 text-xs rounded transition-colors ${
                selectedIds.includes(eq.id)
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-zinc-400 border border-zinc-700 hover:bg-zinc-800'
              }`}
            >
              {eq.latex.slice(0, 20)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export interface FavoritesProps {
  favorites?: string[];
  onToggle?: (equationId: string) => void;
  equations?: Array<{ id: string; latex: string }>;
}

export function Favorites({ favorites = [], onToggle, equations = [] }: FavoritesProps) {
  if (favorites.length === 0) return null;

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Favorites</h4>
      {equations
        .filter((eq) => favorites.includes(eq.id))
        .map((eq) => (
          <div key={eq.id} className="flex items-center justify-between py-1">
            <span className="text-xs text-zinc-300 truncate">{eq.latex}</span>
            {onToggle && (
              <button
                onClick={() => onToggle(eq.id)}
                className="text-yellow-400 hover:text-yellow-300"
              >
                ★
              </button>
            )}
          </div>
        ))}
    </div>
  );
}

export interface RecentHistoryProps {
  history?: Array<{ id: string; latex: string; timestamp: number }>;
  onSelect?: (equationId: string) => void;
  maxItems?: number;
}

export function RecentHistory({ history = [], onSelect, maxItems = 5 }: RecentHistoryProps) {
  const recent = history.slice(0, maxItems);

  if (recent.length === 0) return null;

  return (
    <div className="space-y-1">
      <h4 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Recent</h4>
      {recent.map((item) => (
        <button
          key={item.id}
          onClick={() => onSelect?.(item.id)}
          className="block w-full text-left py-1 text-xs text-zinc-300 hover:text-zinc-100 truncate"
        >
          {item.latex}
        </button>
      ))}
    </div>
  );
}
