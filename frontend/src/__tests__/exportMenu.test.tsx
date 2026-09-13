import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ExportMenu, SettingsPanel } from '../components/ui/ExportMenu';

describe('ExportMenu', () => {
  test('renders export button', () => {
    render(<ExportMenu />);
    expect(screen.getByText('Export ▾')).toBeDefined();
  });

  test('shows dropdown when clicked', () => {
    render(<ExportMenu />);
    fireEvent.click(screen.getByText('Export ▾'));
    expect(screen.getByText('SVG (Vector)')).toBeDefined();
    expect(screen.getByText('PNG (Image)')).toBeDefined();
    expect(screen.getByText('JSON (Data)')).toBeDefined();
  });

  test('calls onExport when format selected', () => {
    const onExport = vi.fn();
    render(<ExportMenu onExport={onExport} />);
    fireEvent.click(screen.getByText('Export ▾'));
    fireEvent.click(screen.getByText('SVG (Vector)'));
    expect(onExport).toHaveBeenCalledWith('svg');
  });

  test('shows only specified formats', () => {
    render(<ExportMenu formats={['svg', 'json']} />);
    fireEvent.click(screen.getByText('Export ▾'));
    expect(screen.getByText('SVG (Vector)')).toBeDefined();
    expect(screen.queryByText('PNG (Image)')).toBeNull();
    expect(screen.getByText('JSON (Data)')).toBeDefined();
  });
});

describe('SettingsPanel', () => {
  test('renders settings title', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Settings')).toBeDefined();
  });

  test('renders checkboxes', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Show Grid')).toBeDefined();
    expect(screen.getByText('Show Axes')).toBeDefined();
    expect(screen.getByText('Grid Size')).toBeDefined();
  });

  test('renders theme selector', () => {
    render(<SettingsPanel />);
    expect(screen.getByText('Theme')).toBeDefined();
  });

  test('calls onSettingsChange when checkbox toggled', () => {
    const onSettingsChange = vi.fn();
    render(<SettingsPanel onSettingsChange={onSettingsChange} />);
    const checkbox = screen.getByText('Show Grid').closest('label')?.querySelector('input');
    fireEvent.click(checkbox!);
    expect(onSettingsChange).toHaveBeenCalled();
  });

  test('calls onCameraReset when reset button clicked', () => {
    const onCameraReset = vi.fn();
    render(<SettingsPanel onCameraReset={onCameraReset} />);
    fireEvent.click(screen.getByText('Reset Camera'));
    expect(onCameraReset).toHaveBeenCalled();
  });
});
