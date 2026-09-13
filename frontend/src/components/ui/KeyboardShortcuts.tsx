import React, { useEffect, useState, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  description: string;
  action: () => void;
}

export interface KeyboardShortcutsProps {
  shortcuts?: KeyboardShortcut[];
  enabled?: boolean;
}

export function KeyboardShortcuts({
  shortcuts = [],
  enabled = true,
}: KeyboardShortcutsProps) {
  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey || e.metaKey : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : true;
        const altMatch = shortcut.alt ? e.altKey : true;

        if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
          e.preventDefault();
          shortcut.action();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts, enabled]);

  return null;
}

export interface HelpModalProps {
  isOpen: boolean;
  onClose?: () => void;
  shortcuts?: Array<{ key: string; description: string }>;
}

export function HelpModal({
  isOpen,
  onClose,
  shortcuts = [
    { key: 'R', description: 'Render current equation' },
    { key: 'Space', description: 'Play/Pause animation' },
    { key: '← →', description: 'Navigate equations' },
    { key: '↑ ↓', description: 'Adjust parameters' },
    { key: 'G', description: 'Toggle grid' },
    { key: 'A', description: 'Toggle axes' },
    { key: '?', description: 'Show this help' },
    { key: 'Esc', description: 'Close modal' },
  ],
}: HelpModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-zinc-100">Keyboard Shortcuts</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200"
          >
            ×
          </button>
        </div>

        <div className="space-y-2">
          {shortcuts.map((shortcut) => (
            <div key={shortcut.key} className="flex items-center justify-between">
              <kbd className="px-2 py-0.5 text-xs font-mono bg-zinc-800 border border-zinc-700 rounded text-zinc-300">
                {shortcut.key}
              </kbd>
              <span className="text-sm text-zinc-400">{shortcut.description}</span>
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-6 w-full px-4 py-2 text-sm text-zinc-400 border border-zinc-700 rounded hover:bg-zinc-800"
        >
          Close
        </button>
      </div>
    </div>
  );
}
