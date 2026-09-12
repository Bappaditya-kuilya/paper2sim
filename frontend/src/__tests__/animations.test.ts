import { fadeIn, slideUp, scaleIn } from '../lib/animations';
describe('animations', () => {
  it('fadeIn has initial opacity 0', () => { expect(fadeIn.initial.opacity).toBe(0); });
  it('slideUp has y offset', () => { expect((slideUp.initial as any).y).toBe(20); });
  it('scaleIn has scale', () => { expect((scaleIn.initial as any).scale).toBe(0.95); });
});
