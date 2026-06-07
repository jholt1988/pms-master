import { Body, Controller, Get, HttpCode, Param, Patch, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { GenerateOwnerStatementsPayload } from './operator-owner-statements.types';
import { OperatorOwnerStatementsService } from './operator-owner-statements.service';

type AuthenticatedRequest = Request & { user: { userId: string; username?: string; role: Role } };

@Controller('operator-owner-statements')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@UseApiEnvelope()
export class OperatorOwnerStatementsController {
  constructor(private readonly ownerStatementsService: OperatorOwnerStatementsService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator owner statement review workbench') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Query('month') month?: string) {
    return this.ownerStatementsService.getWorkbench(orgId, req.user, { month });
  }

  @Post('generate')
  @HttpCode(201)
  @ApiCreatedResponse({ schema: envelopeSchema('Generated owner statements') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  generate(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Body() payload: GenerateOwnerStatementsPayload) {
    return this.ownerStatementsService.generate(orgId, req.user, payload.month);
  }

  @Patch(':statementId/approve')
  @ApiOkResponse({ schema: envelopeSchema('Approved owner statement') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  approve(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Param('statementId') statementId: string) {
    return this.ownerStatementsService.approve(orgId, req.user, statementId);
  }

  @Patch(':statementId/send')
  @ApiOkResponse({ schema: envelopeSchema('Sent owner statement') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  send(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Param('statementId') statementId: string) {
    return this.ownerStatementsService.send(orgId, req.user, statementId);
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
