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

  beforeEach(() => {
    jest.clearAllMocks();
  });

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
