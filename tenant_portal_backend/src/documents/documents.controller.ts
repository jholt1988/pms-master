import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport'; // Keep this line
import { DocumentsService } from './documents.service';
import { DocumentCategory } from '@prisma/client'; // Renamed to avoid conflict
import { Request, Response } from 'express';
import { memoryStorage } from 'multer';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    username: string;
    role: string;
  };
}

@Controller('documents')
@UseGuards(AuthGuard('jwt'), OrgContextGuard)
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
    @Body('category') category: DocumentCategory, // Use the renamed enum
    @Body('description') description?: string,
    @Body('leaseId') leaseId?: string,
    @Body('propertyId') propertyId?: string,
    @OrgId() orgId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    return this.documentsService.uploadFile(
      file,
      req.user.sub,
      {
        category,
        description,
        leaseId,
        propertyId,
      },
      orgId,
    );
  }

  @Get()
  async listDocuments(
    @Req() req: AuthenticatedRequest,
    @Query('category') category?: DocumentCategory,
    @Query('leaseId') leaseId?: string, // Keep this as string for query param
    @Query('propertyId') propertyId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @OrgId() orgId?: string,
  ) {
    return this.documentsService.listDocuments({
      userId: req.user.sub,
      category,
      leaseId,
      propertyId,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      orgId,
    });
  }

  @Get(':id/download')
  async downloadFile(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @OrgId() orgId?: string,
  ) {
    const fileStream = await this.documentsService.getFileStream(id, req.user.sub, orgId);
    res.setHeader('Content-Type', fileStream.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileStream.fileName}"`);
    fileStream.stream.pipe(res);
  }

  @Post(':id/share')
  async shareDocument(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Body('userIds') userIds: string[],
    @OrgId() orgId?: string,
  ) {
    return this.documentsService.shareDocument(id, userIds, req.user.sub, orgId);
  }

  @Delete(':id')
  async deleteDocument(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest, @OrgId() orgId?: string) {
    return this.documentsService.deleteDocument(id, req.user.sub, orgId);
  }
}
