import { Body, Controller, Get, Headers, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { createEventEnvelope } from '../common/events/event-envelope';
import { IdempotencyService } from '../common/idempotency/idempotency.service';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';

@Controller('foundation')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@UseApiEnvelope()
export class FoundationController {
  constructor(private readonly idempotency: IdempotencyService) {}

  @Get('event-envelope/example')
  @ApiOkResponse({ schema: envelopeSchema('Foundation event envelope example') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getEventEnvelopeExample(@OrgId() orgId: string) {
    return createEventEnvelope({
        type: 'foundation.smoke.checked',
        source: 'tenant_portal_backend',
        organizationId: orgId,
        subject: { type: 'foundation', id: orgId },
        payload: { ready: true },
      });
  }

  @Post('idempotency/reserve')
  @ApiOkResponse({ schema: envelopeSchema('Foundation idempotency reservation') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async reserveIdempotencyKey(
    @OrgId() orgId: string,
    @Headers('idempotency-key') idempotencyKey: string | undefined,
    @Body() body: { scope?: string },
  ) {
    const key = idempotencyKey || `${orgId}:foundation-smoke`;
    const scope = body.scope || 'foundation';
    return this.idempotency.reserve(scope, key, orgId);
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
