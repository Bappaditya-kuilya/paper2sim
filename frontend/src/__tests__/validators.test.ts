import { isValidUrl, isArxivUrl, sanitizeInput } from '../lib/validators';
describe('validators', () => {
  it('isValidUrl', () => { expect(isValidUrl('https://example.com')).toBe(true); expect(isValidUrl('not url')).toBe(false); });
  it('isArxivUrl', () => { expect(isArxivUrl('https://arxiv.org/abs/2301.00001')).toBe(true); expect(isArxivUrl('https://google.com')).toBe(false); });
  it('sanitizeInput', () => { expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script'); });
});
