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
} from './dto/simple-inspection.dto';

@Controller('api/inspections')
export class InspectionController {
  constructor(
    private readonly inspectionService: InspectionService,
    private readonly estimateService: EstimateService,
  ) {}

  // Inspection CRUD operations

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createInspection(
    @Body() dto: CreateInspectionDto,
    @Request() req: any,
  ) {
    return this.inspectionService.createInspection(dto, req.user.id);
  }

  @Post('with-rooms')
  @HttpCode(HttpStatus.CREATED)
  async createInspectionWithRooms(
    @Body() dto: CreateInspectionWithRoomsDto,
    @Request() req: any,
  ) {
    return this.inspectionService.createInspectionWithRooms(dto, req.user.id);
  }

  @Get()
  async getInspections(@Query() query: InspectionQueryDto) {
    return this.inspectionService.getInspections(query);
  }

  @Get('stats')
  async getInspectionStats(@Query('propertyId') propertyId?: string) {
    return this.inspectionService.getInspectionStats(
      propertyId ? parseInt(propertyId) : undefined
    );
  }

  @Get(':id')
  async getInspection(@Param('id', ParseIntPipe) id: number) {
    return this.inspectionService.getInspectionById(id);
  }

  @Patch(':id')
  async updateInspection(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateInspectionDto,
  ) {
    return this.inspectionService.updateInspection(id, dto);
  }

  @Post(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeInspection(@Param('id', ParseIntPipe) id: number) {
    return this.inspectionService.completeInspection(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteInspection(@Param('id', ParseIntPipe) id: number) {
    await this.inspectionService.deleteInspection(id);
  }

  // Room operations

  @Post(':id/rooms')
  @HttpCode(HttpStatus.CREATED)
  async createRoom(
    @Param('id', ParseIntPipe) inspectionId: number,
    @Body() dto: CreateRoomDto,
  ) {
    return this.inspectionService.createRoomWithDefaultChecklist(inspectionId, dto);
  }

  // Checklist item operations

  @Patch('items/:itemId')
  async updateChecklistItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateChecklistItemDto,
  ) {
    return this.inspectionService.updateChecklistItem(itemId, dto);
  }

  @Post('items/:itemId/photos')
  @HttpCode(HttpStatus.CREATED)
  async addPhotoToChecklistItem(
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UploadPhotoDto,
    @Request() req: any,
  ) {
    return this.inspectionService.addPhotoToChecklistItem(itemId, dto, req.user.id);
  }

  // File upload endpoint for photos
  @Post('items/:itemId/photos/upload')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
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

    return this.inspectionService.addPhotoToChecklistItem(itemId, dto, req.user.id);
  }

  // Signature operations

  @Post(':id/signatures')
  @HttpCode(HttpStatus.CREATED)
  async addSignature(
    @Param('id', ParseIntPipe) inspectionId: number,
    @Body() dto: CreateSignatureDto,
  ) {
    return this.inspectionService.addSignature(inspectionId, dto);
  }

  // Report generation

  @Get(':id/report')
  async generateReport(@Param('id', ParseIntPipe) id: number) {
    // This would generate a PDF report
    // For now, return inspection data in a report format
    const inspection = await this.inspectionService.getInspectionById(id);
    
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
  @HttpCode(HttpStatus.CREATED)
  async generateEstimate(
    @Param('id', ParseIntPipe) inspectionId: number,
    @Request() req: any,
  ) {
    return this.estimateService.generateEstimateFromInspection(inspectionId, req.user.id);
  }

  @Get(':id/estimates')
  async getInspectionEstimates(@Param('id', ParseIntPipe) inspectionId: number) {
    return this.estimateService.getEstimates({ inspectionId });
  }
}