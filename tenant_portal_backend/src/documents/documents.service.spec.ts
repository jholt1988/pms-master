import { NotFoundException } from '@nestjs/common';
import { DocumentCategory } from '@prisma/client';
import { DocumentsService } from './documents.service';

describe('DocumentsService tenant lease visibility', () => {
  const prisma: any = {
    document: {
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  let service: DocumentsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentsService(prisma);
  });

  it('includes lease tenant access in listDocuments scope', async () => {
    prisma.document.findMany.mockResolvedValue([]);
    prisma.document.count.mockResolvedValue(0);

    await service.listDocuments({
      userId: 'tenant-user-id',
      category: DocumentCategory.LEASE,
    });

    expect(prisma.document.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { uploadedById: 'tenant-user-id' },
                { sharedWith: { some: { id: 'tenant-user-id' } } },
                { lease: { tenantId: 'tenant-user-id' } },
              ]),
            }),
          ]),
        }),
      }),
    );
  });

  it('allows tenant to download lease-linked document without explicit share', async () => {
    prisma.document.findFirst.mockResolvedValue({
      id: 44,
      fileName: 'lease.pdf',
      filePath: 'lease.pdf',
      mimeType: 'application/pdf',
    });

    const fsAccessSpy = jest.spyOn(require('fs/promises'), 'access').mockResolvedValue(undefined as any);
    const createReadStreamSpy = jest
      .spyOn(require('fs'), 'createReadStream')
      .mockReturnValue({ pipe: jest.fn() } as any);

    const result = await service.getFileStream(44, 'tenant-user-id');

    expect(prisma.document.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              OR: expect.arrayContaining([
                { uploadedById: 'tenant-user-id' },
                { sharedWith: { some: { id: 'tenant-user-id' } } },
                { lease: { tenantId: 'tenant-user-id' } },
              ]),
            }),
          ]),
        }),
      }),
    );
    expect(result.fileName).toBe('lease.pdf');

    fsAccessSpy.mockRestore();
    createReadStreamSpy.mockRestore();
  });

  it('still throws when document cannot be found in tenant scope', async () => {
    prisma.document.findFirst.mockResolvedValue(null);

    await expect(service.getFileStream(999, 'tenant-user-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
