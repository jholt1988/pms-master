import { Body, Controller, Get, Param, Patch, Post, Request, Res, UseGuards, ParseIntPipe } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Request as ExpressRequest, Response } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { EsignatureService } from './esignature.service';
import { CreateEnvelopeDto } from './dto/create-envelope.dto';
import { RecipientViewDto } from './dto/recipient-view.dto';
import { VoidEnvelopeDto } from './dto/void-envelope.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: string;
    role: Role;
    username?: string;
  };
}

@Controller(['esignature','api/esignature'])
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class EsignatureController {
  constructor(private readonly esignatureService: EsignatureService) {}

  @Get('leases/:leaseId/envelopes')
  @Roles(Role.PROPERTY_MANAGER, Role.TENANT)
  getLeaseEnvelopes(@Param('leaseId') leaseId: string, @Request() req: AuthenticatedRequest) {
    return this.esignatureService.listLeaseEnvelopes(leaseId, req.user);
  }

  @Post('leases/:leaseId/envelopes')
  @Roles(Role.PROPERTY_MANAGER)
  createEnvelope(
    @Param('leaseId') leaseId: string,
    @Body() dto: CreateEnvelopeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.esignatureService.createEnvelope(leaseId, dto, req.user.userId);
  }

  @Post('envelopes/:envelopeId/recipient-view')
  @Roles(Role.TENANT)
  createRecipientView(
    @Param('envelopeId') envelopeId: string,
    @Body() dto: RecipientViewDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.esignatureService.createRecipientView(Number(envelopeId), req.user, dto);
  }

  @Get('envelopes/:envelopeId')
  @Roles(Role.PROPERTY_MANAGER, Role.TENANT)
  getEnvelope(
    @Param('envelopeId', ParseIntPipe) envelopeId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.esignatureService.getEnvelope(envelopeId, req.user);
  }

  @Patch('envelopes/:envelopeId/void')
  @Roles(Role.PROPERTY_MANAGER)
  voidEnvelope(
    @Param('envelopeId', ParseIntPipe) envelopeId: number,
    @Body() dto: VoidEnvelopeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.esignatureService.voidEnvelope(envelopeId, dto.reason, req.user.userId);
  }

  @Post('envelopes/:envelopeId/refresh')
  @Roles(Role.PROPERTY_MANAGER, Role.TENANT)
  refreshEnvelopeStatus(
    @Param('envelopeId', ParseIntPipe) envelopeId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.esignatureService.refreshEnvelopeStatus(envelopeId, req.user);
  }

  @Post('envelopes/:envelopeId/resend')
  @Roles(Role.PROPERTY_MANAGER)
  resendNotifications(
    @Param('envelopeId', ParseIntPipe) envelopeId: number,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.esignatureService.resendNotifications(envelopeId, req.user.userId);
  }

  @Get('envelopes/:envelopeId/documents/signed')
  @Roles(Role.PROPERTY_MANAGER, Role.TENANT)
  async downloadSignedDocument(
    @Param('envelopeId', ParseIntPipe) envelopeId: number,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const fileStream = await this.esignatureService.getDocumentStream(envelopeId, 'signed', req.user);
    res.setHeader('Content-Type', fileStream.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileStream.fileName}"`);
    fileStream.stream.pipe(res);
  }

  @Get('envelopes/:envelopeId/documents/certificate')
  @Roles(Role.PROPERTY_MANAGER, Role.TENANT)
  async downloadCertificate(
    @Param('envelopeId', ParseIntPipe) envelopeId: number,
    @Request() req: AuthenticatedRequest,
    @Res() res: Response,
  ) {
    const fileStream = await this.esignatureService.getDocumentStream(envelopeId, 'certificate', req.user);
    res.setHeader('Content-Type', fileStream.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileStream.fileName}"`);
    fileStream.stream.pipe(res);
  }
}
