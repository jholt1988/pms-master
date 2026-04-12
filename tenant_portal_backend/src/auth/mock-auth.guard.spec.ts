import { MockAuthGuard } from './mock-auth.guard';

describe('MockAuthGuard', () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    jest.restoreAllMocks();
  });

  function makeContext(headers: Record<string, string> = {}) {
    const request: any = { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      request,
    } as any;
  }

  it('normalizes legacy lowercase mock roles to canonical uppercase roles', () => {
    process.env.NODE_ENV = 'development';
    const guard = new MockAuthGuard();
    const context = makeContext({
      'x-mock-user-id': 'dev-user-1',
      'x-mock-role': 'tenant',
    });

    const allowed = guard.canActivate(context);

    expect(allowed).toBe(true);
    expect(context.request.user).toEqual({
      id: 'dev-user-1',
      role: 'TENANT',
    });
  });

  it('passes canonical uppercase roles through unchanged', () => {
    process.env.NODE_ENV = 'development';
    const guard = new MockAuthGuard();
    const context = makeContext({
      'x-mock-user-id': 'dev-user-2',
      'x-mock-role': 'ADMIN',
    });

    guard.canActivate(context);

    expect(context.request.user.role).toBe('ADMIN');
  });

  it('maps legacy workspace personas onto canonical auth roles', () => {
    process.env.NODE_ENV = 'development';
    const guard = new MockAuthGuard();
    const context = makeContext({
      'x-mock-user-id': 'dev-user-3',
      'x-mock-role': 'leasing',
    });

    guard.canActivate(context);

    expect(context.request.user.role).toBe('PROPERTY_MANAGER');
  });

  it('denies execution in production', () => {
    process.env.NODE_ENV = 'production';
    const guard = new MockAuthGuard();
    const errorSpy = jest.spyOn((guard as any).logger, 'error').mockImplementation(() => undefined);
    const context = makeContext();

    const allowed = guard.canActivate(context);

    expect(allowed).toBe(false);
    expect(errorSpy).toHaveBeenCalled();
  });
});
