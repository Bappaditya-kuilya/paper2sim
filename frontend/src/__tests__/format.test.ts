import { formatDuration, formatNumber, truncateText } from '../lib/format';
describe('format', () => {
  it('formatDuration', () => { expect(formatDuration(90)).toBe('1:30'); expect(formatDuration(5)).toBe('0:05'); });
  it('formatNumber', () => { expect(formatNumber(1234567)).toBe('1,234,567'); });
  it('truncateText', () => { expect(truncateText('hello', 3)).toBe('hel...'); expect(truncateText('hi', 10)).toBe('hi'); });
});
