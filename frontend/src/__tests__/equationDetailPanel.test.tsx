import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { EquationDetailPanel } from '../components/ui/EquationDetailPanel';

describe('EquationDetailPanel', () => {
  const equation = {
    id: 'eq-1',
    latex: 'y = mx + b',
    type: 'polynomial',
    confidence: 0.95,
    parameters: { m: 2, b: 1 },
  };

  test('renders equation latex', () => {
    render(<EquationDetailPanel equation={equation} />);
    expect(screen.getByText('y = mx + b')).toBeDefined();
  });

  test('renders type badge', () => {
    render(<EquationDetailPanel equation={equation} />);
    expect(screen.getByText('polynomial')).toBeDefined();
  });

  test('renders confidence', () => {
    render(<EquationDetailPanel equation={equation} />);
    expect(screen.getByText('95% confidence')).toBeDefined();
  });

  test('calls onCopy when copy button clicked', () => {
    const onCopy = vi.fn();
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<EquationDetailPanel equation={equation} onCopy={onCopy} />);
    fireEvent.click(screen.getByText('Copy LaTeX'));
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('y = mx + b');
  });

  test('calls onRender when render button clicked', () => {
    const onRender = vi.fn();
    render(<EquationDetailPanel equation={equation} onRender={onRender} />);
    fireEvent.click(screen.getByText('Render 3D'));
    expect(onRender).toHaveBeenCalledWith('eq-1');
  });

  test('renders parameter inputs', () => {
    render(<EquationDetailPanel equation={equation} />);
    expect(screen.getByText('Parameters')).toBeDefined();
    expect(screen.getByDisplayValue('2')).toBeDefined();
    expect(screen.getByDisplayValue('1')).toBeDefined();
  });

  test('calls onParameterChange when parameter edited', () => {
    const onParameterChange = vi.fn();
    render(<EquationDetailPanel equation={equation} onParameterChange={onParameterChange} />);
    const input = screen.getByDisplayValue('2');
    fireEvent.change(input, { target: { value: '5' } });
    expect(onParameterChange).toHaveBeenCalledWith('m', 5);
  });

  test('renders without parameters', () => {
    const eqNoParams = { ...equation, parameters: undefined };
    render(<EquationDetailPanel equation={eqNoParams} />);
    expect(screen.queryByText('Parameters')).toBeNull();
  });
});
