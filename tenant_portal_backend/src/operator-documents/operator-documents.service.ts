import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { DocumentCategory } from '@prisma/client';

export interface OperatorDocumentsMetrics {
  total: number;
  byCategory: Record<string, number>;
  recentUploads: number;
}

export interface OperatorDocumentsWorkbench {
  generatedAt: string;
  metrics: OperatorDocumentsMetrics;
  documents: any[];
  total: number;
  sourceLinks: { label: string; href: string; entityType: string }[];
}

@Injectable()
export class OperatorDocumentsService {
  private readonly logger = new Logger(OperatorDocumentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly documentsService: DocumentsService,
  ) {}

  async getWorkbench(
    orgId: string,
    options: { category?: DocumentCategory; propertyId?: string; leaseId?: string; skip?: number; take?: number } = {},
  ): Promise<OperatorDocumentsWorkbench> {
    const [documents, total, categoryCounts, recentUploadsCount] = await Promise.all([
      this.prisma.document.findMany({
        where: this.buildOrgWhere(orgId, options),
        include: {
          uploadedBy: { select: { id: true, username: true } },
          property: { select: { id: true, name: true } },
          lease: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: options.skip ?? 0,
        take: options.take ?? 50,
      }),
      this.prisma.document.count({ where: this.buildOrgWhere(orgId, options) }),
      this.getCategoryCounts(orgId),
      this.getRecentUploadsCount(orgId),
    ]);

    // Strip filePath from response for security
    const safeDocuments = documents.map(({ filePath: _filePath, ...doc }) => doc);

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        total,
        byCategory: categoryCounts,
        recentUploads: recentUploadsCount,
      },
      documents: safeDocuments,
      total,
      sourceLinks: [
        { label: 'Canonical documents API', href: '/api/documents', entityType: 'Document' },
      ],
    };
  }

  async uploadFile(
    orgId: string,
    userId: string,
    file: Express.Multer.File,
    data: {
      category: DocumentCategory;
      description?: string;
      leaseId?: string;
      propertyId?: string;
    },
  ) {
    return this.documentsService.uploadFile(file, userId, data, orgId);
  }

  async downloadFile(documentId: number, userId: string, orgId: string) {
    return this.documentsService.getFileStream(documentId, userId, orgId);
  }

  async deleteDocument(documentId: number, userId: string, orgId: string) {
    // Verify the document belongs to the org before deleting
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        OR: [
          { property: { organizationId: orgId } },
          { lease: { unit: { property: { organizationId: orgId } } } },
        ],
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found or you do not have permission to delete it');
    }

    return this.documentsService.deleteDocument(documentId, userId, orgId);
  }

  private buildOrgWhere(
    orgId: string,
    options: { category?: DocumentCategory; propertyId?: string; leaseId?: string },
  ) {
    return {
      OR: [
        { property: { organizationId: orgId } },
        { lease: { unit: { property: { organizationId: orgId } } } },
      ],
      ...(options.category ? { category: options.category } : {}),
      ...(options.propertyId ? { propertyId: options.propertyId } : {}),
      ...(options.leaseId ? { leaseId: options.leaseId } : {}),
    };
  }

  private async getCategoryCounts(orgId: string): Promise<Record<string, number>> {
    const grouped = await this.prisma.document.groupBy({
      by: ['category'],
      where: {
        OR: [
          { property: { organizationId: orgId } },
          { lease: { unit: { property: { organizationId: orgId } } } },
        ],
      },
      _count: { category: true },
    });

    const counts: Record<string, number> = {};
    for (const row of grouped) {
      counts[row.category] = row._count.category;
    }
    return counts;
  }

  private async getRecentUploadsCount(orgId: string): Promise<number> {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    return this.prisma.document.count({
      where: {
        OR: [
          { property: { organizationId: orgId } },
          { lease: { unit: { property: { organizationId: orgId } } } },
        ],
        createdAt: { gte: sevenDaysAgo },
      },
    });
  }
}
