import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentCategory, Prisma } from '@prisma/client'; 
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
    userId: number,
    data: {
      category: DocumentCategory;
      description?: string;
      leaseId?: number;
      propertyId?: number;
    },
  ) {
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
        ...(data.leaseId && { lease: { connect: { id: data.leaseId } } }),
        ...(data.propertyId && { property: { connect: { id: data.propertyId } } }),
      },
    });

    return document;
  }

  async saveBuffer(
    buffer: Buffer,
    params: {
      fileName: string;
      userId: number;
      category: DocumentCategory;
      description?: string;
      leaseId?: number;
      propertyId?: number;
      mimeType?: string;
    },
  ) {
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
        ...(params.leaseId && { lease: { connect: { id: params.leaseId } } }),
        ...(params.propertyId && { property: { connect: { id: params.propertyId } } }),
      },
    });
  }

  async getFileStream(documentId: number, userId: number) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        OR: [
          { uploadedById: userId },
          { sharedWith: { some: { id: userId } } },
        ],
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
    userId?: number;
    category?: DocumentCategory;
    leaseId?: number;
    propertyId?: number;
    skip?: number;
    take?: number;
  }) {
    const where: Prisma.DocumentWhereInput = {
      ...(filters.userId && {
        OR: [
          { uploadedById: filters.userId },
          { sharedWith: { some: { id: filters.userId } } },
        ],
      }),
      ...(filters.category && { category: filters.category }),
      ...(filters.leaseId && { leaseId: filters.leaseId }),
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

  async shareDocument(documentId: number, userIds: number[], requestingUserId: number) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        uploadedById: requestingUserId, // Only owner can share
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

  async deleteDocument(documentId: number, userId: number) {
    const document = await this.prisma.document.findFirst({
      where: {
        id: documentId,
        uploadedById: userId, // Only owner can delete
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
}
