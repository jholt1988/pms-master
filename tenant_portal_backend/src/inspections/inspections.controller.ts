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
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role, InspectionType, InspectionStatus } from '@prisma/client';
import { InspectionsService } from './inspections.service';
import { CreateInspectionDto } from './dto/create-inspection.dto';
import { UpdateInspectionDto } from './dto/update-inspection.dto';
import { CompleteInspectionDto } from './dto/complete-inspection.dto';
import { Request } from 'express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs/promises';
import { randomBytes } from 'crypto';

interface AuthenticatedRequest extends Request {
  user: {
    sub: number;
    username: string;
    role: Role;
  };
}

@Controller('inspections')
@UseGuards(AuthGuard('jwt'), RolesGuard)
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
  @Roles(Role.PROPERTY_MANAGER)
  async create(@Body() dto: CreateInspectionDto, @Req() req: AuthenticatedRequest) {
    return this.inspectionsService.create(
      {
        ...dto,
        scheduledDate: new Date(dto.scheduledDate),
      },
      req.user.sub,
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
  ) {
    return this.inspectionsService.findAll({
      userId: req.user.sub,
      userRole: req.user.role,
      unitId: unitId ? parseInt(unitId, 10) : undefined,
      propertyId: propertyId ? parseInt(propertyId, 10) : undefined,
      status,
      type,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.inspectionsService.findOne(id, req.user.sub, req.user.role);
  }

  @Put(':id')
  @Roles(Role.PROPERTY_MANAGER)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInspectionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.inspectionsService.update(
      id,
      {
        ...dto,
        scheduledDate: dto.scheduledDate ? new Date(dto.scheduledDate) : undefined,
      },
      req.user.sub,
    );
  }

  @Put(':id/complete')
  @Roles(Role.PROPERTY_MANAGER)
  async complete(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CompleteInspectionDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.inspectionsService.complete(id, dto, req.user.sub);
  }

  @Post(':id/photos')
  @Roles(Role.PROPERTY_MANAGER)
  @UseInterceptors(
    FileInterceptor('photo', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async addPhoto(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (!file) {
      throw new Error('No file provided');
    }

    // Save file
    const fileExt = path.extname(file.originalname);
    const fileName = `${randomBytes(16).toString('hex')}${fileExt}`;
    const filePath = path.join(this.uploadDir, fileName);
    await fs.writeFile(filePath, file.buffer);

    // Get base URL for serving files (in production, use CDN or proper file serving)
    const url = `/uploads/inspections/${fileName}`;

    return this.inspectionsService.addPhoto(id, url, caption, req.user.sub);
  }

  @Delete(':id')
  @Roles(Role.PROPERTY_MANAGER)
  async delete(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.inspectionsService.delete(id, req.user.sub);
  }
}

