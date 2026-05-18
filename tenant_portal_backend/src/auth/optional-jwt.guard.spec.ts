import { OptionalJwtAuthGuard } from './optional-jwt.guard';

describe('OptionalJwtAuthGuard', () => {
  const guard = new OptionalJwtAuthGuard();

  it('returns user when present', () => {
    expect(guard.handleRequest(null, { id: 'u1' })).toEqual({ id: 'u1' });
  });

  it('returns null when user is not present', () => {
    expect(guard.handleRequest(null, undefined)).toBeNull();
  });

  it('throws when auth pipeline has error', () => {
    expect(() => guard.handleRequest(new Error('boom'), null)).toThrow('boom');
  });
});
