import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { KeyboardShortcuts, HelpModal } from '../components/ui/KeyboardShortcuts';

describe('KeyboardShortcuts', () => {
  test('renders nothing', () => {
    const { container } = render(<KeyboardShortcuts />);
    expect(container.firstChild).toBeNull();
  });

  test('registers keyboard handler', () => {
    const action = vi.fn();
    const shortcuts = [
      { key: 'r', description: 'Render', action },
    ];
    render(<KeyboardShortcuts shortcuts={shortcuts} />);
    fireEvent.keyDown(window, { key: 'r' });
    expect(action).toHaveBeenCalled();
  });

  test('does not fire when disabled', () => {
    const action = vi.fn();
    const shortcuts = [
      { key: 'r', description: 'Render', action },
    ];
    render(<KeyboardShortcuts shortcuts={shortcuts} enabled={false} />);
    fireEvent.keyDown(window, { key: 'r' });
    expect(action).not.toHaveBeenCalled();
  });

  test('handles ctrl modifier', () => {
    const action = vi.fn();
    const shortcuts = [
      { key: 's', ctrl: true, description: 'Save', action },
    ];
    render(<KeyboardShortcuts shortcuts={shortcuts} />);
    fireEvent.keyDown(window, { key: 's', ctrlKey: true });
    expect(action).toHaveBeenCalled();
  });
});

describe('HelpModal', () => {
  test('does not render when closed', () => {
    render(<HelpModal isOpen={false} />);
    expect(screen.queryByText('Keyboard Shortcuts')).toBeNull();
  });

  test('renders when open', () => {
    render(<HelpModal isOpen={true} />);
    expect(screen.getByText('Keyboard Shortcuts')).toBeDefined();
  });

  test('renders default shortcuts', () => {
    render(<HelpModal isOpen={true} />);
    expect(screen.getByText('R')).toBeDefined();
    expect(screen.getByText('Space')).toBeDefined();
    expect(screen.getByText('← →')).toBeDefined();
  });

  test('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('×'));
    expect(onClose).toHaveBeenCalled();
  });

  test('calls onClose when close button at bottom clicked', () => {
    const onClose = vi.fn();
    render(<HelpModal isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('Close'));
    expect(onClose).toHaveBeenCalled();
  });

  test('renders custom shortcuts', () => {
    const shortcuts = [
      { key: 'X', description: 'Custom action' },
    ];
    render(<HelpModal isOpen={true} shortcuts={shortcuts} />);
    expect(screen.getByText('X')).toBeDefined();
    expect(screen.getByText('Custom action')).toBeDefined();
  });
});
