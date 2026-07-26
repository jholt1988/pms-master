import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { Request, Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { DocumentCategory } from '@prisma/client';
import { OperatorDocumentsService } from './operator-documents.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    sub: string;
    username: string;
    role: Role;
  };
};

@Controller('operator-documents')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorDocumentsController {
  constructor(private readonly operatorDocumentsService: OperatorDocumentsService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator documents workbench summary') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(
    @OrgId() orgId: string,
    @Query('category') category?: DocumentCategory,
    @Query('propertyId') propertyId?: string,
    @Query('leaseId') leaseId?: string,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
  ) {
    return this.operatorDocumentsService.getWorkbench(orgId, {
      category,
      propertyId,
      leaseId,
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
    });
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
      },
    }),
  )
  @ApiCreatedResponse({ schema: envelopeSchema('Uploaded document') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: AuthenticatedRequest,
    @OrgId() orgId: string,
    @Body('category') category: DocumentCategory,
    @Body('description') description?: string,
    @Body('leaseId') leaseId?: string,
    @Body('propertyId') propertyId?: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const userId = req.user.sub || req.user.userId;

    return this.operatorDocumentsService.uploadFile(orgId, userId, file, {
      category,
      description,
      leaseId,
      propertyId,
    });
  }

  @Get(':id/download')
  @ApiOkResponse({ schema: envelopeSchema('Downloaded document') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async downloadFile(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @OrgId() orgId: string,
  ) {
    const userId = req.user.sub || req.user.userId;
    const fileStream = await this.operatorDocumentsService.downloadFile(id, userId, orgId);
    res.setHeader('Content-Type', fileStream.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileStream.fileName}"`);
    fileStream.stream.pipe(res);
  }

  @Delete(':id')
  @ApiOkResponse({ schema: envelopeSchema('Deleted document') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async deleteDocument(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    const userId = req.user.sub || req.user.userId;
    return this.operatorDocumentsService.deleteDocument(id, userId, orgId);
  }
}

function envelopeSchema(description: string) {
  return {
    type: 'object',
    description,
    required: ['data', 'meta', 'errors'],
    properties: {
      data: { type: 'object', additionalProperties: true },
      meta: { type: 'object', additionalProperties: true },
      errors: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
  };
}
