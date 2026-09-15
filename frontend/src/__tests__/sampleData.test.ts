import { describe, test, expect } from 'vitest';
import { getSampleEquations } from '../lib/sampleData';

describe('getSampleEquations', () => {
  test('returns deterministic tagged equations covering 3d and info', () => {
    const eqs = getSampleEquations();
    expect(eqs.length).toBeGreaterThan(0);
    expect(eqs.map((e) => e.vizMode).sort()).toEqual(['3d', 'info']);
    expect(eqs).toEqual(getSampleEquations());
  });
});
