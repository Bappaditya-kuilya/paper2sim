import { describe, test, expect, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { InputTabs } from '../components/InputTabs';

function renderTabs(onTabChange = vi.fn()) {
  render(
    <InputTabs
      onResult={vi.fn()}
      onInlineError={vi.fn()}
      busy={false}
      onBusy={vi.fn()}
      defaultSample={vi.fn()}
      onTabChange={onTabChange}
    />,
  );
  return onTabChange;
}

describe('InputTabs PDF remove', () => {
  test('Remove empties the file input so the same file re-enables extract', () => {
    renderTabs();
    fireEvent.click(screen.getByRole('tab', { name: 'PDF' }));
    const input = screen.getByLabelText('Upload PDF') as HTMLInputElement;
    const file = new File(['x'], 'paper.pdf', { type: 'application/pdf' });
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByRole('button', { name: 'Extract equations' })).toBeEnabled();
    // jsdom's file input has no C:\fakepath filename — emulate the browser's displayed value.
    Object.defineProperty(input, 'value', {
      configurable: true,
      writable: true,
      value: 'C:\\fakepath\\paper.pdf',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));
    expect(screen.getByRole('button', { name: 'Extract equations' })).toBeDisabled();
    expect(input.value).toBe('');
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByRole('button', { name: 'Extract equations' })).toBeEnabled();
  });

  test('switching tabs notifies the host to clear its stale notice', () => {
    const onTabChange = renderTabs();
    fireEvent.click(screen.getByRole('tab', { name: 'arXiv' }));
    expect(onTabChange).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(screen.getByRole('tab', { name: 'arXiv' }), { key: 'ArrowRight' });
    expect(onTabChange).toHaveBeenCalledTimes(2);
  });
});
