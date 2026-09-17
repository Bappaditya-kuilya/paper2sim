import { describe, test, expect } from 'vitest';
import { PALETTE, newRow, toggleRow, duplicateRow } from '../lib/expressionRows';
import { DEFAULT_VIEWPORT, panViewport, zoomViewport } from '../lib/viewport';

describe('PALETTE', () => {
  test('has 6 hex colors', () => {
    expect(PALETTE).toHaveLength(6);
    for (const c of PALETTE) expect(c).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

describe('newRow', () => {
  test('visible true, empty params, unique ids', () => {
    const a = newRow('y=x', PALETTE[0]);
    const b = newRow('y=x', PALETTE[0]);
    expect(a.latex).toBe('y=x');
    expect(a.color).toBe(PALETTE[0]);
    expect(a.visible).toBe(true);
    expect(a.params).toEqual({});
    expect(typeof a.id).toBe('string');
    expect(a.id).not.toBe(b.id);
  });
});

describe('toggleRow', () => {
  test('flips visible, pure', () => {
    const r = newRow('y=x', PALETTE[0]);
    const t = toggleRow(r);
    expect(t.visible).toBe(false);
    expect(toggleRow(t).visible).toBe(true);
    expect(r.visible).toBe(true);
    expect(t.latex).toBe(r.latex);
  });
});

describe('duplicateRow', () => {
  test('copies fields with fresh id', () => {
    const r = { ...newRow('y=x', PALETTE[0]), params: { k: { value: 1, min: 0, max: 2, step: 0.1 } } };
    const d = duplicateRow(toggleRow(r));
    expect(d.id).not.toBe(r.id);
    expect(d.latex).toBe(r.latex);
    expect(d.color).toBe(r.color);
    expect(d.visible).toBe(false);
    expect(d.params).toEqual(r.params);
    expect(d.params).not.toBe(r.params);
  });
});

describe('DEFAULT_VIEWPORT', () => {
  test('x/y [-10,10]', () => {
    expect(DEFAULT_VIEWPORT).toEqual({ x: [-10, 10], y: [-10, 10] });
  });
});

describe('panViewport', () => {
  test('shifts by data-unit deltas, pure', () => {
    const v = { x: [-10, 10] as [number, number], y: [-10, 10] as [number, number] };
    expect(panViewport(v, 2, -3)).toEqual({ x: [-8, 12], y: [-13, 7] });
    expect(v).toEqual({ x: [-10, 10], y: [-10, 10] });
  });
});

describe('zoomViewport', () => {
  test('factor>1 zooms in at cursor', () => {
    const v = { x: [-10, 10] as [number, number], y: [-10, 10] as [number, number] };
    expect(zoomViewport(v, 0, 0, 2)).toEqual({ x: [-5, 5], y: [-5, 5] });
  });

  test('factor<1 zooms out at cursor', () => {
    const v = { x: [-10, 10] as [number, number], y: [-10, 10] as [number, number] };
    expect(zoomViewport(v, 10, 10, 0.5)).toEqual({ x: [-30, 10], y: [-30, 10] });
  });

  test('clamps span to [0.5,40] each axis', () => {
    const v = { x: [-10, 10] as [number, number], y: [-10, 10] as [number, number] };
    const tiny = zoomViewport(v, 0, 0, 1000);
    expect(tiny.x[1] - tiny.x[0]).toBeCloseTo(0.5);
    expect(tiny.y[1] - tiny.y[0]).toBeCloseTo(0.5);
    const huge = zoomViewport(v, 0, 0, 0.01);
    expect(huge.x[1] - huge.x[0]).toBeCloseTo(40);
    expect(huge.y[1] - huge.y[0]).toBeCloseTo(40);
  });
});
