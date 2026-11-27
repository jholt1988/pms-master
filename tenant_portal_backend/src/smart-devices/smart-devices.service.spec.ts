import { createRequire } from 'node:module';
import { createHook, type AsyncHook } from 'node:async_hooks';
import { Logger, ServiceUnavailableException } from '@nestjs/common';
import { SmartDevicesService } from './smart-devices.service';
import { PrismaService } from '../prisma/prisma.service';

const nodeRequire = createRequire(__filename);
const http = nodeRequire('node:http') as typeof import('node:http');
const https = nodeRequire('node:https') as typeof import('node:https');
const net = nodeRequire('node:net') as typeof import('node:net');
const tls = nodeRequire('node:tls') as typeof import('node:tls');

const NETWORK_RESOURCES = new Set([
  'TCPWRAP',
  'TLSWRAP',
  'HTTPCLIENTREQUEST',
  'GETADDRINFOREQ',
  'TCPCONNECTWRAP',
]);

const SEAM_ENV = ['SEAM_SANDBOX', 'SEAM_API_URL', 'SEAM_API_KEY'] as const;

const input = {
  deviceId: 'device-1',
  propertyId: 'property-1',
  unitId: 'unit-1',
  code: '123456',
  name: 'Move-in',
  startsAt: new Date('2026-01-01T00:00:00.000Z'),
  endsAt: new Date('2026-12-31T00:00:00.000Z'),
};

type Spy = jest.SpyInstance;

class NetworkWatch {
  private readonly spies: Spy[] = [];
  private baselines: number[] = [];
  private hook: AsyncHook | null = null;
  private resources: string[] = [];

  arm(): void {
    const maybe = (obj: object, key: string) => {
      const value = (obj as Record<string, unknown>)[key];
      if (typeof value !== 'function') return;
      this.spies.push(jest.spyOn(obj as never, key as never));
    };

    maybe(http, 'request');
    maybe(http, 'get');
    maybe(http, 'Agent');
    maybe(https, 'request');
    maybe(https, 'get');
    maybe(https, 'Agent');
    maybe(net, 'connect');
    maybe(net, 'createConnection');
    maybe(net, 'Socket');
    maybe(tls, 'connect');
    maybe(tls, 'TLSSocket');
    if (typeof globalThis.fetch === 'function') {
      this.spies.push(jest.spyOn(globalThis, 'fetch'));
    }

    this.baselines = this.spies.map((spy) => spy.mock.calls.length);
    this.resources = [];
    this.hook = createHook({
      init: (_asyncId, type) => {
        if (NETWORK_RESOURCES.has(type)) this.resources.push(type);
      },
    });
    this.hook.enable();
  }

  assertNoSocketOrClient(): void {
    this.spies.forEach((spy, index) => {
      const constructed = spy.mock.calls.length - this.baselines[index];
      expect({
        client: spy.getMockName(),
        constructed,
      }).toEqual({
        client: spy.getMockName(),
        constructed: 0,
      });
    });
    expect(this.resources).toEqual([]);
  }

  restore(): void {
    this.hook?.disable();
    this.hook = null;
    this.spies.forEach((spy) => spy.mockRestore());
    this.spies.length = 0;
  }
}

describe('SmartDevicesService.generateAccessCode seam sandbox flag', () => {
  let service: SmartDevicesService;
  let accessCodeCreate: jest.Mock;
  const savedEnv: Partial<Record<(typeof SEAM_ENV)[number], string | undefined>> = {};

  beforeEach(() => {
    for (const key of SEAM_ENV) savedEnv[key] = process.env[key];
    clearSeamEnv();

    accessCodeCreate = jest.fn().mockResolvedValue({
      id: 'access-code-1',
      ...input,
      status: 'ACTIVE',
    });
    const prisma = {
      accessCode: { create: accessCodeCreate },
    } as unknown as PrismaService;
    service = new SmartDevicesService(prisma);
  });

  afterEach(() => {
    for (const key of SEAM_ENV) {
      const previous = savedEnv[key];
      if (previous === undefined) delete process.env[key];
      else process.env[key] = previous;
    }
    jest.restoreAllMocks();
  });

  it('flag off writes the AccessCode and constructs no socket or client', async () => {
    const watch = new NetworkWatch();
    watch.arm();
    const log = jest.spyOn(Logger.prototype, 'log').mockImplementation(() => undefined);

    const created = await service.generateAccessCode(input);

    expect(created).toEqual(expect.objectContaining({ id: 'access-code-1', status: 'ACTIVE' }));
    expect(accessCodeCreate).toHaveBeenCalledTimes(1);
    expect(accessCodeCreate).toHaveBeenCalledWith({
      data: {
        deviceId: input.deviceId,
        propertyId: input.propertyId,
        unitId: input.unitId,
        code: input.code,
        name: input.name,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        status: 'ACTIVE',
      },
    });
    expect(log).toHaveBeenCalledWith(
      `Generating access code for device ${input.deviceId} via provider API...`,
    );
    watch.assertNoSocketOrClient();
    watch.restore();
  });

  it('explicit false still writes locally and does not use a present URL or key', async () => {
    process.env.SEAM_SANDBOX = 'false';
    process.env.SEAM_API_URL = 'https://sandbox.example.test';
    process.env.SEAM_API_KEY = 'sandbox-key';
    const watch = new NetworkWatch();
    watch.arm();

    await service.generateAccessCode(input);

    expect(accessCodeCreate).toHaveBeenCalledTimes(1);
    watch.assertNoSocketOrClient();
    watch.restore();
  });

  it.each([
    [{ SEAM_SANDBOX: 'true' }, /SEAM_API_URL and SEAM_API_KEY/],
    [{ SEAM_SANDBOX: 'true', SEAM_API_URL: 'https://sandbox.example.test' }, /SEAM_API_KEY/],
    [{ SEAM_SANDBOX: 'true', SEAM_API_KEY: 'sandbox-key' }, /SEAM_API_URL/],
    [{ SEAM_SANDBOX: '1', SEAM_API_URL: '   ', SEAM_API_KEY: 'sandbox-key' }, /SEAM_API_URL/],
  ])('flag on with missing config throws and does not write (%j)', async (env, message) => {
    Object.assign(process.env, env);
    const watch = new NetworkWatch();
    watch.arm();

    await expect(service.generateAccessCode(input)).rejects.toBeInstanceOf(ServiceUnavailableException);
    await expect(service.generateAccessCode(input)).rejects.toThrow(message);

    expect(accessCodeCreate).not.toHaveBeenCalled();
    watch.assertNoSocketOrClient();
    watch.restore();
  });

  it('flag on with URL and key still does not call a vendor or write an AccessCode', async () => {
    process.env.SEAM_SANDBOX = 'true';
    process.env.SEAM_API_URL = 'https://sandbox.example.test';
    process.env.SEAM_API_KEY = 'sandbox-key';
    const watch = new NetworkWatch();
    watch.arm();

    await expect(service.generateAccessCode(input)).rejects.toThrow(
      /sandbox client is not implemented/,
    );

    expect(accessCodeCreate).not.toHaveBeenCalled();
    watch.assertNoSocketOrClient();
    watch.restore();
  });
});

function clearSeamEnv(): void {
  for (const key of SEAM_ENV) delete process.env[key];
}
