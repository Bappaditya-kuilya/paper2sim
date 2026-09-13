import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { TabSystem, PaperHeader } from '../components/ui/TabSystem';

describe('TabSystem', () => {
  const tabs = [
    { id: 'equations', label: 'Equations' },
    { id: 'render', label: '3D View' },
    { id: 'video', label: 'Video' },
  ];

  test('renders all tabs', () => {
    render(<TabSystem tabs={tabs} />);
    expect(screen.getByText('Equations')).toBeDefined();
    expect(screen.getByText('3D View')).toBeDefined();
    expect(screen.getByText('Video')).toBeDefined();
  });

  test('calls onChange when tab clicked', () => {
    const onChange = vi.fn();
    render(<TabSystem tabs={tabs} onChange={onChange} />);
    fireEvent.click(screen.getByText('3D View'));
    expect(onChange).toHaveBeenCalledWith('render');
  });

  test('renders with active tab', () => {
    render(<TabSystem tabs={tabs} activeTab="render" />);
    const activeTab = screen.getByText('3D View');
    expect(activeTab.className).toContain('border-b-2');
  });

  test('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<TabSystem tabs={tabs} onClose={onClose} />);
    const closeButtons = screen.getAllByText('×');
    fireEvent.click(closeButtons[0]);
    expect(onClose).toHaveBeenCalledWith('equations');
  });

  test('renders add button when onAdd provided', () => {
    const onAdd = vi.fn();
    render(<TabSystem tabs={tabs} onAdd={onAdd} />);
    fireEvent.click(screen.getByText('+'));
    expect(onAdd).toHaveBeenCalled();
  });

  test('persists tab selection', () => {
    const localStorageMock = {
      getItem: vi.fn().mockReturnValue('render'),
      setItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    render(<TabSystem tabs={tabs} persistKey="main" />);
    expect(localStorageMock.getItem).toHaveBeenCalledWith('tab-main');
  });
});

describe('PaperHeader', () => {
  test('renders title and author', () => {
    render(<PaperHeader title="Test Paper" author="John Doe" />);
    expect(screen.getByText('Test Paper')).toBeDefined();
    expect(screen.getByText('John Doe')).toBeDefined();
  });

  test('renders abstract', () => {
    render(<PaperHeader abstract="This is a test abstract" />);
    expect(screen.getByText('This is a test abstract')).toBeDefined();
  });

  test('renders view paper button when url provided', () => {
    const onOpenUrl = vi.fn();
    render(<PaperHeader url="https://arxiv.org/1234" onOpenUrl={onOpenUrl} />);
    fireEvent.click(screen.getByText('View Paper'));
    expect(onOpenUrl).toHaveBeenCalled();
  });

  test('does not render view paper button without url', () => {
    render(<PaperHeader />);
    expect(screen.queryByText('View Paper')).toBeNull();
  });
});
