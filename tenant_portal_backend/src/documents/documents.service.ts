import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentCategory, Prisma } from '@prisma/client'; 
import { isUUID } from 'class-validator';
import { Multer } from 'multer';
import { Express } from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomBytes } from 'crypto';

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);
  private readonly uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

  constructor(private readonly prisma: PrismaService) {
    // Ensure upload directory exists
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: any, // Fixed: Express.Multer.File may not be available, use any
    userId: string,
    data: {
      category: DocumentCategory;
      description?: string;
      leaseId?: string;
      propertyId?: string;
    },
    orgId?: string,
  ) {
    if (orgId) {
      if (data.leaseId) {
        const leaseId = this.parseUuidId(data.leaseId, 'lease');
        const lease = await this.prisma.lease.findFirst({
          where: { id: leaseId, unit: { property: { organizationId: orgId } } },
          select: { id: true },
        });
        if (!lease) {
          throw new NotFoundException('Lease not found');
        }
      }

      if (data.propertyId) {
        const property = await this.prisma.property.findFirst({
          where: { id: data.propertyId, organizationId: orgId },
          select: { id: true },
        });
        if (!property) {
          throw new NotFoundException('Property not found');
        }
      }
    }

    // Generate unique filename
    const fileExt = path.extname(file.originalname);
    const fileName = `${randomBytes(16).toString('hex')}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);

    // Save file
    await fs.writeFile(filePath, file.buffer);

    // Create document record
    const document = await this.prisma.document.create({
      data: {
        fileName: file.originalname,
        filePath: fileName, // Store relative path
        category: data.category,
        description: data.description,
        uploadedBy: { connect: { id: userId } },
      ...(data.leaseId &&
        (() => {
          const leaseId = this.parseUuidId(data.leaseId, 'lease');
          return { lease: { connect: { id: leaseId } } };
        })()),
      ...(data.propertyId &&
        (() => {
          const propertyId = data.propertyId;
          return { property: { connect: { id: propertyId } } };
        })()),
      },
    });

    return document;
  }

  async saveBuffer(
    buffer: Buffer,
    params: {
      fileName: string;
      userId: string;
      category: DocumentCategory;
      description?: string;
      leaseId?: string;
      propertyId?: string;
      mimeType?: string;
    },
    orgId?: string,
  ) {
    if (orgId) {
      if (params.leaseId) {
        const leaseId = this.parseUuidId(params.leaseId, 'lease');
        const lease = await this.prisma.lease.findFirst({
          where: { id: leaseId, unit: { property: { organizationId: orgId } } },
          select: { id: true },
        });
        if (!lease) {
          throw new NotFoundException('Lease not found');
        }
      }

      if (params.propertyId) {
        const property = await this.prisma.property.findFirst({
          where: { id: params.propertyId, organizationId: orgId },
          select: { id: true },
        });
        if (!property) {
          throw new NotFoundException('Property not found');
        }
      }
    }

    const fileExt = path.extname(params.fileName) || '.pdf';
    const fileName = `${randomBytes(16).toString('hex')}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);

    await fs.writeFile(filePath, buffer);

    return this.prisma.document.create({
      data: {
        fileName: params.fileName,
        filePath: fileName,
        category: params.category,
        description: params.description,
        mimeType: params.mimeType ?? 'application/pdf',
        uploadedBy: { connect: { id: params.userId } },
        ...(params.leaseId &&
          (() => {
            const leaseId = this.parseUuidId(params.leaseId, 'lease');
            return { lease: { connect: { id: leaseId } } };
          })()),
        ...(params.propertyId &&
          (() => {
            const propertyId = params.propertyId;
            return { property: { connect: { id: propertyId } } };
          })()),
      },
    });
  }

  async getFileStream(documentId: number, userId: string, orgId?: string) {
    const accessScope = {
      OR: [
        { uploadedById: userId },
        { sharedWith: { some: { id: userId } } },
        { lease: { tenantId: userId } },
      ],
    };

    const orgScope = orgId
      ? {
          OR: [
            { property: { organizationId: orgId } },
            { lease: { unit: { property: { organizationId: orgId } } } },
          ],
        }
      : undefined;

    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        AND: [accessScope, ...(orgScope ? [orgScope] : [])],
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found or access denied');
    }

    const filePath = path.join(this.uploadDir, document.filePath);
    try {
      await fs.access(filePath);
    } catch {
      throw new NotFoundException('File not found on disk');
    }

    const fsSync = await import('fs');
    return {
      stream: fsSync.createReadStream(filePath),
      fileName: document.fileName,
      mimeType: document.mimeType || 'application/octet-stream',
    };
  }

  async listDocuments(filters: {
    userId?: string;
    category?: DocumentCategory;
    leaseId?: string;
    propertyId?: string;
    skip?: number;
    take?: number;
    orgId?: string;
  }) {
    const clauses: Prisma.DocumentWhereInput[] = [];

    if (filters.userId) {
      clauses.push({
        OR: [
          { uploadedById: filters.userId },
          { sharedWith: { some: { id: filters.userId } } },
          { lease: { tenantId: filters.userId } },
        ],
      });
    }

    if (filters.orgId) {
      clauses.push({
        OR: [
          { property: { organizationId: filters.orgId } },
          { lease: { unit: { property: { organizationId: filters.orgId } } } },
        ],
      });
    }

    const where: Prisma.DocumentWhereInput = {
      ...(clauses.length ? { AND: clauses } : {}),
      ...(filters.category && { category: filters.category }),
      ...(filters.leaseId && { leaseId: this.parseUuidId(filters.leaseId, 'lease') }),
      ...(filters.propertyId && { propertyId: filters.propertyId }),
    };

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        include: {
          uploadedBy: {
            select: {
              id: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: filters.skip || 0,
        take: filters.take || 50,
      }),
      this.prisma.document.count({ where }),
    ]);

    // Remove filePath from response for security
    return {
      data: documents.map(({ filePath, ...doc }) => doc),
      total,
    };
  }

  async shareDocument(documentId: number, userIds: string[], requestingUserId: string, orgId?: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        uploadedById: requestingUserId, // Only owner can share
        ...(orgId
          ? {
              OR: [
                { property: { organizationId: orgId } },
                { lease: { unit: { property: { organizationId: orgId } } } },
              ],
            }
          : {}),
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found or you do not have permission to share it');
    }

    await this.prisma.document.update({
      where: { id: documentId },
      data: {
        sharedWith: {
          set: userIds.map((id) => ({ id })),
        },
      },
    });

    return { success: true };
  }

  async deleteDocument(documentId: number, userId: string, orgId?: string) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        uploadedById: userId, // Only owner can delete
        ...(orgId
          ? {
              OR: [
                { property: { organizationId: orgId } },
                { lease: { unit: { property: { organizationId: orgId } } } },
              ],
            }
          : {}),
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found or you do not have permission to delete it');
    }

    // Delete file from disk
    const filePath = path.join(this.uploadDir, document.filePath);
    try {
      await fs.unlink(filePath);
    } catch (error) {
      this.logger.warn(`Failed to delete file ${filePath}: ${error}`);
    }

    // Delete from database
    await this.prisma.document.delete({
      where: { id: documentId },
    });

    return { success: true };
  }

  private parseUuidId(value: string, field: string): string {
    if (!isUUID(value)) {
      throw new BadRequestException(`Invalid ${field} identifier provided.`);
    }
    return value;
  }

  private parseNumericId(value: string | number, field: string): number {
    const id = Number(value);
    if (isNaN(id)) {
      throw new BadRequestException(`Invalid ${field} identifier provided.`);
    }
    return id;
  }
}
