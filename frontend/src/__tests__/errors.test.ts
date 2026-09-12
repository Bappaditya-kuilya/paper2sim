import { AppError, formatError } from '../lib/errors';
describe('errors', () => {
  it('AppError has message', () => { expect(new AppError('fail').message).toBe('fail'); });
  it('formatError handles string', () => { expect(formatError(new Error('bad'))).toBe('bad'); });
  it('formatError handles unknown', () => { expect(formatError(null)).toBe('An unexpected error occurred'); });
});
