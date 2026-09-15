import { describe, test, expect } from 'vitest';
import { getSampleEquations } from '../lib/sampleData';

describe('getSampleEquations', () => {
  test('returns deterministic tagged equations (both 3d since physics now has a canvas)', () => {
    const eqs = getSampleEquations();
    expect(eqs.length).toBeGreaterThan(0);
    expect(eqs.map((e) => e.vizMode).sort()).toEqual(['3d', '3d']);
    expect(eqs).toEqual(getSampleEquations());
  });
});
