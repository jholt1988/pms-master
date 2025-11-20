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

interface AuthenticatedRequest extends Request {
  user: {
    sub: number;
    username: string;
    role: string;
  };
}

@Controller('documents')
@UseGuards(AuthGuard('jwt'))
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
        leaseId: leaseId ? parseInt(leaseId, 10) : undefined,
        propertyId: propertyId ? parseInt(propertyId, 10) : undefined,
      },
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
  ) {
    return this.documentsService.listDocuments({
      userId: req.user.sub,
      category,
      leaseId: leaseId ? parseInt(leaseId, 10) : undefined,
      propertyId: propertyId ? parseInt(propertyId, 10) : undefined,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Get(':id/download')
  async downloadFile(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const fileStream = await this.documentsService.getFileStream(id, req.user.sub);
    res.setHeader('Content-Type', fileStream.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileStream.fileName}"`);
    fileStream.stream.pipe(res);
  }

  @Post(':id/share')
  async shareDocument(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Body('userIds') userIds: number[],
  ) {
    return this.documentsService.shareDocument(id, userIds, req.user.sub);
  }

  @Delete(':id')
  async deleteDocument(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    return this.documentsService.deleteDocument(id, req.user.sub);
  }
}
