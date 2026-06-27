import { ConfigService } from '@nestjs/config';
import { TokenBlacklistService } from './token-blacklist.service';

const mockRedisInstance = {
  on: jest.fn(),
  quit: jest.fn(),
  set: jest.fn(),
  get: jest.fn(),
};

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => mockRedisInstance);
});

describe('TokenBlacklistService', () => {
  const config = {
    get: jest.fn().mockReturnValue('redis://localhost:6379'),
  } as unknown as ConfigService;

  // The service disables itself (no Redis) when NODE_ENV==='test' or
  // DISABLE_REDIS==='true'. These tests exercise the REAL Redis path, so we
  // force-enable it by clearing those guards for the duration of the suite.
  const prevNodeEnv = process.env.NODE_ENV;
  const prevDisableRedis = process.env.DISABLE_REDIS;

  const restoreEnv = () => {
    process.env.NODE_ENV = prevNodeEnv;
    if (prevDisableRedis === undefined) {
      delete process.env.DISABLE_REDIS;
    } else {
      process.env.DISABLE_REDIS = prevDisableRedis;
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.NODE_ENV = 'development';
    delete process.env.DISABLE_REDIS;
  });

  // Restore after EACH test (runs even when a test throws) so a failing test
  // can't leak the mutated NODE_ENV / DISABLE_REDIS into later suites. afterAll
  // is kept as a final safety net.
  afterEach(restoreEnv);
  afterAll(restoreEnv);

  it('initializes and closes redis client', async () => {
    const svc = new TokenBlacklistService(config);
    await svc.onModuleInit();
    expect(mockRedisInstance.on).toHaveBeenCalledWith('error', expect.any(Function));
    await svc.onModuleDestroy();
    expect(mockRedisInstance.quit).toHaveBeenCalledTimes(1);
  });

  it('blacklists and checks token ids', async () => {
    const svc = new TokenBlacklistService(config);
    await svc.onModuleInit();
    mockRedisInstance.get.mockResolvedValueOnce('1').mockResolvedValueOnce(null);
    await svc.blacklist('jti-1', 60);
    expect(mockRedisInstance.set).toHaveBeenCalledWith('token:blacklist:jti-1', '1', 'EX', 60);
    await expect(svc.isBlacklisted('jti-1')).resolves.toBe(true);
    await expect(svc.isBlacklisted('jti-2')).resolves.toBe(false);
  });
});
