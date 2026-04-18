// Story 15: Document Management System
// POST /documents, GET /documents, GET /documents/:id, DELETE /documents/:id
// Dependencies: 1, 2, 3, 4, 11 | Estimate: Medium

import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards, NotFoundException, UploadedFile, UseInterceptors, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.decorator';
import { Roles } from '../../auth/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs/promises';
import * as path from 'path';

interface CreateDocumentDto {
  name: string;
  category?: string;
  propertyId?: number;
  unitId?: number;
  leaseId?: number;
  tenantId?: number;
}

interface DocumentQueryDto {
  propertyId?: number;
  unitId?: number;
  leaseId?: number;
  category?: string;
  limit?: number;
  offset?: number;
}

@Controller('documents')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DocumentManagementController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Roles('PROPERTY_MANAGER', 'ADMIN', 'TENANT')
  @UseInterceptors(FileInterceptor('file'))
  async createDocument(
    @Body() dto: CreateDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!dto.name?.trim()) {
      throw new BadRequestException('Document name is required');
    }

    // Validate ownership if provided
    if (dto.propertyId) {
      const property = await this.prisma.property.findUnique({
        where: { id: dto.propertyId },
      });
      if (!property) {
        throw new NotFoundException('Property not found');
      }
    }

    if (dto.unitId) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: dto.unitId },
      });
      if (!unit) {
        throw new NotFoundException('Unit not found');
      }
    }

    if (dto.leaseId) {
      const lease = await this.prisma.lease.findUnique({
        where: { id: dto.leaseId },
      });
      if (!lease) {
        throw new NotFoundException('Lease not found');
      }
    }

    // In production, upload to cloud storage (S3, GCS, etc.)
    // For now, store locally
    const storageDir = process.env.DOCUMENT_STORAGE_PATH || '/tmp/documents';
    await fs.mkdir(storageDir, { recursive: true });

    const fileName = file ? file.originalname : `${Date.now()}-${dto.name}`;
    const filePath = file ? path.join(storageDir, fileName) : null;

    if (file && file.buffer) {
      await fs.writeFile(filePath, file.buffer);
    }

    const document = await this.prisma.document.create({
      data: {
        name: dto.name.trim(),
        category: dto.category || 'GENERAL',
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        leaseId: dto.leaseId,
        tenantId: dto.tenantId,
        storagePath: filePath,
        fileSize: file?.size || 0,
        mimeType: file?.mimetype || 'application/octet-stream',
        status: 'ACTIVE',
      },
    });

    console.log('[DOC] Created:', document.id, document.name);

    return {
      id: document.id,
      name: document.name,
      category: document.category,
      createdAt: document.createdAt,
    };
  }

  @Get()
  async listDocuments(@Query() query: DocumentQueryDto) {
    const { propertyId, unitId, leaseId, category, limit = 20, offset = 0 } = query;

    const where: any = {};

    if (propertyId) where.propertyId = propertyId;
    if (unitId) where.unitId = unitId;
    if (leaseId) where.leaseId = leaseId;
    if (category) where.category = category;

    const [documents, total] = await Promise.all([
      this.prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
        include: {
          property: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true } },
          lease: { select: { id: true } },
          tenant: { select: { id: true, fullName: true } },
        },
      }),
      this.prisma.document.count({ where }),
    ]);

    return {
      data: documents,
      total,
      limit,
      offset,
    };
  }

  @Get('categories')
  async listCategories() {
    const categories = await this.prisma.document.groupBy({
      by: ['category'],
      _count: true,
    });

    return categories.map(c => ({
      category: c.category,
      count: c._count,
    }));
  }

  @Get(':id')
  async getDocument(@Param('id') id: string) {
    const docId = parseInt(id, 10);

    const document = await this.prisma.document.findUnique({
      where: { id: docId },
      include: {
        property: { select: { id: true, name: true, address: true } },
        unit: { select: { id: true, name: true } },
        lease: { select: { id: true, startDate: true, endDate: true } },
        tenant: { select: { id: true, fullName: true, email: true } },
      },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    return document;
  }

  @Delete(':id')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async deleteDocument(@Param('id') id: string) {
    const docId = parseInt(id, 10);

    const document = await this.prisma.document.findUnique({
      where: { id: docId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Soft delete
    await this.prisma.document.update({
      where: { id: docId },
      data: { status: 'DELETED' },
    });

    console.log('[DOC] Deleted:', docId);

    return { success: true, id: docId };
  }

  @Get(':id/download')
  async downloadDocument(@Param('id') id: string) {
    const docId = parseInt(id, 10);

    const document = await this.prisma.document.findUnique({
      where: { id: docId },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // In production, generate signed URL for cloud storage
    // For local storage, return file path or stream
    return {
      downloadUrl: `/api/documents/${docId}/raw`,
      fileName: document.name,
      mimeType: document.mimeType,
    };
  }
}