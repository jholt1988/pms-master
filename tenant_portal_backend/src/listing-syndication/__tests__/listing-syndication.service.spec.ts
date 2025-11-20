import { SyndicationChannel, SyndicationStatus } from '@prisma/client';
import { ListingSyndicationService } from '../listing-syndication.service';
import { ListingSyndicationAdapter } from '../providers/listing-syndication.adapter';

const createAdapter = (channel: SyndicationChannel): ListingSyndicationAdapter => ({
  channel,
  buildPayload: jest.fn().mockReturnValue({ propertyId: 1, name: 'Test', photos: [{}] }),
  validate: jest.fn(),
  send: jest.fn().mockResolvedValue({ success: true }),
});

describe('ListingSyndicationService', () => {
  const zillowAdapter = createAdapter(SyndicationChannel.ZILLOW);
  const apartmentsAdapter = createAdapter(SyndicationChannel.APARTMENTS_DOT_COM);
  const mockPrisma: any = {
    syndicationQueue: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    propertyMarketingProfile: { findMany: jest.fn() },
    property: { findUnique: jest.fn() },
    syndicationCredential: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  };
  const mockReporting = { logSyndicationError: jest.fn() };
  const queue = { add: jest.fn() } as any;

  const service = new ListingSyndicationService(
    mockPrisma,
    mockReporting as any,
    zillowAdapter as any,
    apartmentsAdapter as any,
    queue,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (zillowAdapter.send as jest.Mock).mockResolvedValue({ success: true });
  });

  it('queues syndication entries for every adapter and hydrates the Bull queue', async () => {
    mockPrisma.syndicationQueue.findMany.mockResolvedValueOnce([]);
    mockPrisma.property.findUnique.mockResolvedValue({ id: 10 });

    await service.queueSyndication(10);

    expect(mockPrisma.syndicationQueue.create).toHaveBeenCalledTimes(2);
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('processes queue entries and updates status on success', async () => {
    mockPrisma.syndicationQueue.findUnique.mockResolvedValue({
      id: 1,
      propertyId: 10,
      channel: SyndicationChannel.ZILLOW,
      status: SyndicationStatus.PENDING,
      retryCount: 0,
      maxRetries: 3,
      property: {
        id: 10,
        name: 'Test',
        address: '100 Main',
        marketingProfile: null,
        photos: [{ url: 'https://cdn/photo.jpg', caption: 'Front' }],
        amenities: [{ amenity: { key: 'pool', label: 'Pool' }, isFeatured: false }],
        units: [{ id: 1 }],
      },
    });
    mockPrisma.syndicationCredential.findUnique.mockResolvedValue({ config: { apiKey: 'abc' } });
    mockPrisma.syndicationQueue.update.mockResolvedValue({});

    await service.processQueueEntry(1);

    expect(mockPrisma.syndicationQueue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({ status: SyndicationStatus.SUCCESS }),
      }),
    );
  });

  it('retries failed jobs and logs errors through reporting', async () => {
    (zillowAdapter.send as jest.Mock).mockRejectedValueOnce(new Error('API down'));
    mockPrisma.syndicationQueue.findUnique.mockResolvedValue({
      id: 2,
      propertyId: 10,
      channel: SyndicationChannel.ZILLOW,
      status: SyndicationStatus.PENDING,
      retryCount: 0,
      maxRetries: 2,
      property: {
        id: 10,
        name: 'Test',
        address: '100 Main',
        marketingProfile: null,
        photos: [{ url: 'https://cdn/photo.jpg', caption: 'Front' }],
        amenities: [{ amenity: { key: 'pool', label: 'Pool' }, isFeatured: false }],
        units: [{ id: 1 }],
      },
    });
    mockPrisma.syndicationCredential.findUnique.mockResolvedValue({ config: { apiKey: 'abc' } });

    await service.processQueueEntry(2);

    expect(mockReporting.logSyndicationError).toHaveBeenCalledWith(
      expect.objectContaining({ propertyId: 10, channel: SyndicationChannel.ZILLOW }),
    );
    expect(queue.add).toHaveBeenCalledWith('sync', { entryId: 2 }, { delay: 60_000 });
  });
});
