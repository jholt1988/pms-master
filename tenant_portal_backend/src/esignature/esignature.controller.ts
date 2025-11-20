import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Request as ExpressRequest } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { EsignatureService } from './esignature.service';
import { CreateEnvelopeDto } from './dto/create-envelope.dto';
import { RecipientViewDto } from './dto/recipient-view.dto';

interface AuthenticatedRequest extends ExpressRequest {
  user: {
    userId: number;
    role: Role;
  };
}

@Controller(['esignature', 'api/esignature'])
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class EsignatureController {
  constructor(private readonly esignatureService: EsignatureService) {}

  @Get('leases/:leaseId/envelopes')
  @Roles(Role.PROPERTY_MANAGER, Role.TENANT)
  getLeaseEnvelopes(@Param('leaseId') leaseId: string, @Request() req: AuthenticatedRequest) {
    return this.esignatureService.listLeaseEnvelopes(Number(leaseId), req.user);
  }

  @Post('leases/:leaseId/envelopes')
  @Roles(Role.PROPERTY_MANAGER)
  createEnvelope(
    @Param('leaseId') leaseId: string,
    @Body() dto: CreateEnvelopeDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.esignatureService.createEnvelope(Number(leaseId), dto, req.user.userId);
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
}
