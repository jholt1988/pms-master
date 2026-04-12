import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';

describe('RolesGuard', () => {
  function makeContext(role?: string) {
    return {
      getHandler: () => 'handler',
      getClass: () => 'class',
      switchToHttp: () => ({
        getRequest: () => ({ user: role ? { role } : undefined }),
      }),
    } as any;
  }

  it('accepts legacy lowercase/property persona values after normalization', () => {
    const reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(['PROPERTY_MANAGER']),
    } as unknown as Reflector;
    const guard = new RolesGuard(reflector);

    const allowed = guard.canActivate(makeContext('leasing'));

    expect(allowed).toBe(true);
  });
});
