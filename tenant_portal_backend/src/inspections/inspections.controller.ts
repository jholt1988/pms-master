import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId, OptionalOrgId } from '../common/org-context/org-id.decorator';
import { InspectionType, InspectionStatus, Role } from '@prisma/client';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { CompleteInspectionDto } from './dto/complete-inspection.dto';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomBytes } from 'crypto';
import { isUUID } from 'class-validator';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    username: string;
    role: Role;
  };
}

// Legacy inspections API (v1). Kept for backwards compatibility during consolidation.
// Prefer /api/inspections from src/inspection/* going forward.
@Controller(['inspections-legacy', 'inspections'])
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class InspectionsController {
  private readonly uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads', 'inspections');

  constructor(private readonly inspectionsService: InspectionsService) {
    this.ensureUploadDir();
  }

  private async ensureUploadDir() {
    try {
      await fs.access(this.uploadDir);
    } catch {
      await fs.mkdir(this.uploadDir, { recursive: true });
    }
  }

  @Post()
  @Roles('PROPERTY_MANAGER', 'ADMIN', 'OWNER', 'TENANT')
  async create(
    @Body() dto: CreateInspectionDto,
    @Req() req: AuthenticatedRequest,
    @OptionalOrgId() orgId?: string,
  ) {
    return this.inspectionsService.create(
      {
        ...dto,
        scheduledDate: new Date(dto.scheduledDate),
      },
      req.user.sub,
      orgId,
    );
  }

  @Get()
  async findAll(
    @Req() req: AuthenticatedRequest,
    @Query('unitId') unitId?: string,
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: InspectionStatus,
    @Query('type') type?: InspectionType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OptionalOrgId() orgId?: string,
  ) {
    const skipNum = skip ? parseInt(skip, 10) : undefined;
    const takeNum = take ? parseInt(take, 10) : undefined;

    const result = await this.inspectionsService.findAll({
      userId: req.user.sub,
      userRole: req.user.role,
      unitId: this.parseOptionalUuid(unitId, 'unitId'),
      propertyId: this.parseOptionalUuid(propertyId, 'propertyId'),
      status,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      skip: skipNum,
      take: takeNum,
      orgId,
    });

    // Normalized list contract: expose the rows under inspections/data/items
    // (aliases) plus a pagination meta envelope. Consumers rely on this shape.
    const rows = result.data ?? [];
    const total = result.total ?? rows.length;
    const limit = takeNum && takeNum > 0 ? takeNum : total || rows.length;
    const page = limit > 0 ? Math.floor((skipNum ?? 0) / limit) + 1 : 1;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;

    return {
      inspections: rows,
      data: rows,
      items: rows,
      total,
      meta: { total, page, limit, totalPages },
    };
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest, @OptionalOrgId() orgId?: string) {
    return this.inspectionsService.findOne(id, req.user.sub, req.user.role, orgId);
  }

  @Put(':id')
  @Roles('PROPERTY_MANAGER', 'ADMIN', 'OWNER', 'TENANT')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInspectionDto,
    @Req() req: AuthenticatedRequest,
    @OptionalOrgId() orgId?: string,
  ) {
    return this.inspectionsService.update(
      id,
      {
        ...dto,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      },
      req.user.sub,
      orgId,
    );
  }

  @Post('start')
  @Roles('PROPERTY_MANAGER', 'ADMIN', 'OWNER', 'TENANT')
  async start(@Body('inspectionId', ParseIntPipe) inspectionId: number, @Req() req: AuthenticatedRequest, @OptionalOrgId() orgId?: string) {
    return this.inspectionsService.update(
      inspectionId,
      { status: InspectionStatus.IN_PROGRESS },
      req.user.sub,
      orgId,
    );
  }

  @Put(':id/complete')
  @Roles('PROPERTY_MANAGER', 'ADMIN', 'OWNER', 'TENANT')
  async complete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteInspectionDto,
    @Req() req: AuthenticatedRequest,
    @OptionalOrgId() orgId?: string,
  ) {
    return this.inspectionsService.complete(id, dto, req.user.sub, orgId);
  }

  @Put(':id/approve')
  @Roles('PROPERTY_MANAGER', 'ADMIN', 'OWNER')
  async approve(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.inspectionsService.approveInspection(id, req.user.sub, orgId);
  }

  private static readonly allowedMimeTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ]);

  @Post(':id/photos')
  @Roles('PROPERTY_MANAGER', 'ADMIN', 'OWNER', 'TENANT')
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
      fileFilter: (_req, file, cb) => {
        if (InspectionsController.allowedMimeTypes.has(file.mimetype)) {
          cb(null, true);
          return;
        }
        cb(new BadRequestException(`Unsupported file type: ${file.mimetype}`), false);
      },
    }),
  )
  async addPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption: string,
    @Req() req: AuthenticatedRequest,
    @OptionalOrgId() orgId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const fileExt = path.extname(file.originalname);
    const fileName = `${randomBytes(16).toString('hex')}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);
    await fs.writeFile(filePath, file.buffer);

    const url = `/uploads/inspections/${fileName}`;

    return this.inspectionsService.addPhoto(id, url, caption, req.user.sub, orgId);
  }

  @Post('sync')
  @Roles('PROPERTY_MANAGER', 'ADMIN', 'OWNER', 'TENANT')
  async sync(
    @Body('actions') actions: any[],
    @Req() req: AuthenticatedRequest,
    @OptionalOrgId() orgId?: string,
  ) {
    if (!Array.isArray(actions)) {
      throw new BadRequestException('Actions queue must be an array');
    }
    return this.inspectionsService.syncOfflineActions(actions, req.user.sub, orgId);
  }

  @Delete(':id')
  @Roles('PROPERTY_MANAGER', 'ADMIN', 'OWNER')
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest, @OrgId() orgId?: string) {
    return this.inspectionsService.delete(id, req.user.sub, orgId);
  }

  private parseOptionalUuid(value: string | undefined, field: string): string | undefined {
    if (!value) {
      return undefined;
    }

    const trimmed = value.trim();
    if (!trimmed) {
      return undefined;
    }

    if (!isUUID(trimmed)) {
      throw new BadRequestException(`Invalid ${field}: ${value}`);
    }

    return trimmed;
  }
}
