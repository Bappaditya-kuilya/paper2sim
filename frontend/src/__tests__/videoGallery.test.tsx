import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { VideoGallery, RenderAllButton } from '../components/ui/VideoGallery';

describe('VideoGallery', () => {
  const videos = [
    { id: 'v1', equationId: 'eq-1', url: '/video1.mp4', status: 'complete' as const },
    { id: 'v2', equationId: 'eq-2', url: '/video2.mp4', status: 'processing' as const },
    { id: 'v3', equationId: 'eq-3', url: '/video3.mp4', status: 'error' as const },
  ];

  test('renders empty state', () => {
    render(<VideoGallery videos={[]} />);
    expect(screen.getByText('No videos yet')).toBeDefined();
  });

  test('renders video cards', () => {
    render(<VideoGallery videos={videos} />);
    expect(screen.getByText('eq-1')).toBeDefined();
    expect(screen.getByText('eq-2')).toBeDefined();
    expect(screen.getByText('eq-3')).toBeDefined();
  });

  test('calls onSelect when video clicked', () => {
    const onSelect = vi.fn();
    render(<VideoGallery videos={videos} onSelect={onSelect} />);
    fireEvent.click(screen.getByText('eq-1'));
    expect(onSelect).toHaveBeenCalledWith('v1');
  });

  test('calls onDelete when delete button clicked', () => {
    const onDelete = vi.fn();
    render(<VideoGallery videos={videos} onDelete={onDelete} />);
    const deleteButtons = screen.getAllByRole('button');
    fireEvent.click(deleteButtons[0]);
    expect(onDelete).toHaveBeenCalledWith('v1');
  });

  test('highlights selected video', () => {
    render(<VideoGallery videos={videos} selectedId="v1" />);
    const cards = screen.getAllByText('eq-1');
    expect(cards[0].closest('[class*="border-blue-500"]')).toBeDefined();
  });
});

describe('RenderAllButton', () => {
  test('renders with equation count', () => {
    render(<RenderAllButton equationCount={5} renderedCount={0} />);
    expect(screen.getByText('Render All (5)')).toBeDefined();
  });

  test('disables when no equations', () => {
    render(<RenderAllButton equationCount={0} renderedCount={0} />);
    expect(screen.getByText('Render All (0)')).toBeDisabled();
  });

  test('calls onRenderAll when clicked', () => {
    const onRenderAll = vi.fn();
    render(<RenderAllButton equationCount={3} renderedCount={0} onRenderAll={onRenderAll} />);
    fireEvent.click(screen.getByText('Render All (3)'));
    expect(onRenderAll).toHaveBeenCalled();
  });

  test('shows progress when rendering', () => {
    render(<RenderAllButton equationCount={5} renderedCount={2} isRendering />);
    expect(screen.getByText('2 / 5 rendered')).toBeDefined();
    expect(screen.getByText('Cancel')).toBeDefined();
  });

  test('calls onCancel when cancel clicked', () => {
    const onCancel = vi.fn();
    render(<RenderAllButton equationCount={5} renderedCount={2} isRendering onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  test('shows all rendered when complete', () => {
    render(<RenderAllButton equationCount={3} renderedCount={3} />);
    expect(screen.getByText('All Rendered')).toBeDefined();
  });
});
