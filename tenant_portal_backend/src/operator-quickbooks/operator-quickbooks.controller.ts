import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OperatorQuickBooksService } from './operator-quickbooks.service';

type AuthenticatedRequest = Request & {
  user: {
    id: string;
    userId: string;
    role: string;
  };
};

@Controller('operator-quickbooks')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorQuickBooksController {
  constructor(private readonly qbService: OperatorQuickBooksService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('QuickBooks workbench summary') })
  @Roles('ADMIN')
  getWorkbench(@OrgId() orgId: string, @Request() req: AuthenticatedRequest) {
    return this.qbService.getWorkbench(orgId, req.user.id ?? req.user.userId);
  }

  @Post('sync')
  @ApiOkResponse({ schema: envelopeSchema('QuickBooks sync triggered') })
  @Roles('ADMIN')
  triggerSync(@OrgId() orgId: string, @Request() req: AuthenticatedRequest) {
    return this.qbService.triggerSync(orgId, req.user.id ?? req.user.userId);
  }

  @Post('disconnect')
  @ApiOkResponse({ schema: envelopeSchema('QuickBooks disconnected') })
  @Roles('ADMIN')
  disconnect(@OrgId() orgId: string, @Request() req: AuthenticatedRequest) {
    return this.qbService.disconnect(orgId, req.user.id ?? req.user.userId);
  }

  @Get('auth-url')
  @ApiOkResponse({ schema: envelopeSchema('QuickBooks auth URL') })
  @Roles('ADMIN')
  getAuthUrl(@OrgId() orgId: string, @Request() req: AuthenticatedRequest) {
    return this.qbService.getAuthUrl(orgId, req.user.id ?? req.user.userId);
  }

  @Get('test-connection')
  @ApiOkResponse({ schema: envelopeSchema('QuickBooks connection test') })
  @Roles('ADMIN')
  testConnection(@OrgId() orgId: string, @Request() req: AuthenticatedRequest) {
    return this.qbService.testConnection(orgId, req.user.id ?? req.user.userId);
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
