import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { FileInterceptor } from '@nestjs/platform-express';
import { InspectionService } from './inspection.service';
import { EstimateService } from './estimate.service';
import {
  CreateInspectionDto,
  UpdateInspectionDto,
  CreateRoomDto,
  UpdateChecklistItemDto,
  UploadPhotoDto,
  CreateSignatureDto,
  InspectionQueryDto,
  CreateInspectionWithRoomsDto,
  UpdateRoomChecklistItemsDto,
  UpdateInspectionStatusDto,
} from './dto/simple-inspection.dto';

// Blessed inspections API surface (v2). Served under /api/inspections via global prefix.
@Controller('inspections')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class InspectionController {
  constructor(
    private readonly inspectionService: InspectionService,
    private readonly estimateService: EstimateService,
  ) {}

  // Inspection CRUD operations

  @Post()
  @Roles(Role.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async createInspection(
    @Body() dto: CreateInspectionDto,
    @Request() req: any,
    @OrgId() orgId: string,
  ) {
    return this.inspectionService.createInspection(dto, req.user.userId, orgId);
  }

  @Post('with-rooms')
  @Roles(Role.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async createInspectionWithRooms(
    @Body() dto: CreateInspectionWithRoomsDto,
    @Request() req: any,
    @OrgId() orgId: string,
  ) {
    return this.inspectionService.createInspectionWithRooms(dto, req.user.userId, orgId);
  }

  @Get()
  @Roles(Role.PROPERTY_MANAGER, Role.TENANT)
  async getInspections(@Query() query: InspectionQueryDto, @Request() req: any) {
    // Back-compat: some clients expect `{ data: [...] }`, others expect `{ inspections, total, ... }`.
    // Return both shapes until we finish contract normalization.
    const orgId = (req as any).org?.orgId as string | undefined;
    const result = await this.inspectionService.getInspections(query, req.user, orgId);
    return {
      ...result,
      data: result.inspections,
      items: result.inspections,
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
    };
  }

  @Get('stats')
  async getInspectionStats(@Query('propertyId') propertyId?: string, @OrgId() orgId?: string) {
    return this.inspectionService.getInspectionStats(
      propertyId ? this.ensureUuid(propertyId, 'propertyId') : undefined,
      orgId,
    );
  }

  @Get(':id')
  @Roles(Role.PROPERTY_MANAGER, Role.TENANT)
  async getInspection(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.inspectionService.getInspectionById(id, req.user, orgId);
  }

  @Patch(':id')
  @Roles(Role.PROPERTY_MANAGER)
  async updateInspection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInspectionDto,
    @OrgId() orgId: string,
  ) {
    return this.inspectionService.updateInspection(id, dto, orgId);
  }

  @Post(':id/complete')
  @Roles(Role.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.OK)
  async completeInspection(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: string) {
    return this.inspectionService.completeInspection(id, orgId);
  }

  @Patch(':id/status')
  @Roles(Role.PROPERTY_MANAGER, Role.TENANT)
  @HttpCode(HttpStatus.OK)
  async updateInspectionStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInspectionStatusDto,
    @Request() req: any,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.inspectionService.setInspectionStatus(id, dto.status, req.user, orgId);
  }

  @Delete(':id')
  @Roles(Role.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInspection(@Param('id', ParseIntPipe) id: number, @OrgId() orgId: string) {
    await this.inspectionService.deleteInspection(id, orgId);
  }

  // Room operations

  @Post(':id/rooms')
  @Roles(Role.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async createRoom(
    @Param('id', ParseIntPipe) inspectionId: number,
    @Body() dto: CreateRoomDto,
    @OrgId() orgId: string,
  ) {
    return this.inspectionService.createRoomWithDefaultChecklist(inspectionId, dto, orgId);
  }

  // Checklist item operations

  @Patch('items/:itemId')
  @Roles(Role.PROPERTY_MANAGER)
  async updateChecklistItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateChecklistItemDto,
    @OrgId() orgId: string,
  ) {
    return this.inspectionService.updateChecklistItem(itemId, dto, orgId);
  }

  @Patch('rooms/:roomId/items')
  @Roles(Role.PROPERTY_MANAGER, Role.TENANT)
  async updateRoomChecklistItems(
    @Param('roomId', ParseIntPipe) roomId: number,
    @Body() dto: UpdateRoomChecklistItemsDto,
    @Request() req: any,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.inspectionService.updateRoomChecklistItems(roomId, dto.items ?? [], req.user, orgId);
  }

  @Post('items/:itemId/photos')
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.PROPERTY_MANAGER)
  async addPhotoToChecklistItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UploadPhotoDto,
    @Request() req: any,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.inspectionService.addPhotoToChecklistItem(itemId, dto, req.user.userId, orgId);
  }

  // File upload endpoint for photos
  @Post('items/:itemId/photos/upload')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  @Roles(Role.PROPERTY_MANAGER)
  async uploadPhoto(
    @Param('itemId', ParseIntPipe) itemId: number,
    @UploadedFile() file: Express.Multer.File,
    @Body('caption') caption?: string,
    @Request() req?: any,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // In a real implementation, you would:
    // 1. Upload file to cloud storage (AWS S3, etc.)
    // 2. Get the public URL
    // 3. Save the URL to database
    
    // For now, return a mock URL
    const photoUrl = `/uploads/inspections/${Date.now()}-${file.originalname}`;
    
    const dto: UploadPhotoDto = {
      url: photoUrl,
      caption: caption || undefined,
    };

    const orgId = (req as any).org?.orgId as string | undefined;
    return this.inspectionService.addPhotoToChecklistItem(itemId, dto, req.user.userId, orgId);
  }

  // Signature operations

  @Post(':id/signatures')
  @Roles(Role.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async addSignature(
    @Param('id', ParseIntPipe) inspectionId: number,
    @Body() dto: CreateSignatureDto,
    @OrgId() orgId: string,
  ) {
    return this.inspectionService.addSignature(inspectionId, dto, orgId);
  }

  // Report generation

  @Get(':id/report')
  async generateReport(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    // This would generate a PDF report
    // For now, return inspection data in a report format
    const orgId = (req as any).org?.orgId as string | undefined;
    const inspection = await this.inspectionService.getInspectionById(id, req.user, orgId);
    
    return {
      reportId: `inspection-${id}-${Date.now()}`,
      inspection,
      generatedAt: new Date(),
      // In real implementation, this would be a PDF URL
      downloadUrl: `/api/inspections/${id}/report/download`,
    };
  }

  // Estimate operations

  @Post(':id/estimate')
  @Roles(Role.PROPERTY_MANAGER)
  @HttpCode(HttpStatus.CREATED)
  async generateEstimate(
    @Param('id', ParseIntPipe) inspectionId: number,
    @Request() req: any,
    @OrgId() orgId: string,
  ) {
    return this.estimateService.generateEstimateFromInspection(inspectionId, req.user.userId, orgId);
  }

  @Get(':id/estimates')
  @Roles(Role.PROPERTY_MANAGER, Role.TENANT)
  async getInspectionEstimates(@Param('id', ParseIntPipe) inspectionId: number, @Request() req: any) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.estimateService.getEstimates({ inspectionId, orgId });
  }

  private ensureUuid(value: string, field: string): string {
    const normalized = value?.trim();
    const uuidRegex =
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;
    if (!normalized || !uuidRegex.test(normalized)) {
      throw new BadRequestException(`Invalid ${field}`);
    }
    return normalized;
  }
}
