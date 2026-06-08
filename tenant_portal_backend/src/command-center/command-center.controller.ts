import { Body, Controller, Get, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiQuery } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { CommandCenterService } from './command-center.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    role: Role;
  };
};

@Controller('command-center')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@UseApiEnvelope()
export class CommandCenterController {
  constructor(private readonly commandCenterService: CommandCenterService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Command-center snapshot') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getCommandCenter(@OrgId() orgId: string, @Request() req: AuthenticatedRequest) {
    return this.commandCenterService.getCommandCenter(orgId, req.user);
  }

  @Get('decisions')
  @ApiOkResponse({ schema: envelopeSchema('Command-center decision queue') })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'propertyId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'due', required: false })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getDecisionQueue(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Query('type') type?: string,
    @Query('priority') priority?: string,
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: string,
    @Query('due') due?: string,
  ) {
    return this.commandCenterService.getDecisionQueue(orgId, req.user, { type, priority, propertyId, status, due });
  }

  @Get('decisions/:id')
  @ApiOkResponse({ schema: envelopeSchema('Command-center decision detail') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getDecisionDetail(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Param('id') id: string) {
    return this.commandCenterService.getDecisionDetail(orgId, req.user, id);
  }

  @Post('decisions/:id/actions/:actionId')
  @ApiCreatedResponse({ schema: envelopeSchema('Command-center action result') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  executeDecisionAction(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Param('actionId') actionId: string,
    @Body() body: { note?: string },
  ) {
    return this.commandCenterService.executeDecisionAction(orgId, req.user, id, actionId, body?.note);
  }

  @Post('decisions/:id/defer')
  @ApiCreatedResponse({ schema: envelopeSchema('Deferred command-center decision') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  deferDecision(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('id') id: string,
    @Body() body: { reason?: string },
  ) {
    return this.commandCenterService.deferDecision(orgId, req.user, id, body?.reason);
  }

  @Get('daily-briefing')
  @ApiOkResponse({ schema: envelopeSchema('Daily briefing') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getDailyBriefing(@OrgId() orgId: string, @Request() req: AuthenticatedRequest) {
    return this.commandCenterService.getDailyBriefing(orgId, req.user);
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
