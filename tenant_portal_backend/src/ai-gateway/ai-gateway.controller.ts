import { Body, Controller, Get, Headers, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { AiGatewayService } from './ai-gateway.service';
import {
  AiEvaluationRequest,
  AiGatewayRequest,
  ApplicationReviewSummaryRequest,
  BookkeepingCategorizationRequest,
  CommunicationDraftRequest,
  DecisionRecommendationRequest,
  LeaseRiskSummaryRequest,
  MaintenanceClassificationRequest,
  RepairEstimateDraftRequest,
} from './ai-gateway.types';

type AuthenticatedRequest = Request & {
  user: { userId: string; role: Role };
};

@Controller('ai-gateway')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class AiGatewayController {
  constructor(private readonly aiGateway: AiGatewayService) {}

  @Get('capabilities')
  @ApiOkResponse({ schema: envelopeSchema('AI gateway capability manifest') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getCapabilities() {
    return this.aiGateway.getCapabilityManifest();
  }

  @Post('generate')
  @ApiCreatedResponse({ schema: envelopeSchema('AI gateway generated output') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  generate(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: AiGatewayRequest,
    @Headers('x-ai-api-key') byokKey?: string,
  ) {
    // Phase 2B: pass BYOK key from header — never persisted server-side
    return this.aiGateway.generate(orgId, req.user, body, byokKey);
  }

  @Post('evaluate')
  @ApiOkResponse({ schema: envelopeSchema('AI gateway evaluation result') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  evaluate(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: AiEvaluationRequest,
  ) {
    return this.aiGateway.evaluate(orgId, req.user, body);
  }

  @Post('maintenance/classify')
  @ApiOkResponse({ schema: envelopeSchema('AI maintenance classification result') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  classifyMaintenance(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: MaintenanceClassificationRequest,
  ) {
    return this.aiGateway.classifyMaintenance(orgId, req.user, body);
  }

  @Post('communications/draft')
  @ApiOkResponse({ schema: envelopeSchema('AI communication draft result') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  draftCommunication(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: CommunicationDraftRequest,
  ) {
    return this.aiGateway.draftCommunication(orgId, req.user, body);
  }

  @Post('applications/summarize')
  @ApiOkResponse({ schema: envelopeSchema('AI application review summary result') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  summarizeApplicationReview(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: ApplicationReviewSummaryRequest,
  ) {
    return this.aiGateway.summarizeApplicationReview(orgId, req.user, body);
  }

  @Post('leases/summarize-risk')
  @ApiOkResponse({ schema: envelopeSchema('AI lease risk summary result') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  summarizeLeaseRisk(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: LeaseRiskSummaryRequest,
  ) {
    return this.aiGateway.summarizeLeaseRisk(orgId, req.user, body);
  }

  @Post('repair-estimates/draft')
  @ApiOkResponse({ schema: envelopeSchema('AI repair estimate draft result') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  draftRepairEstimate(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: RepairEstimateDraftRequest,
  ) {
    return this.aiGateway.draftRepairEstimate(orgId, req.user, body);
  }

  @Post('bookkeeping/categorize')
  @ApiOkResponse({ schema: envelopeSchema('AI bookkeeping categorization result') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  categorizeBookkeepingTransaction(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: BookkeepingCategorizationRequest,
  ) {
    return this.aiGateway.categorizeBookkeepingTransaction(orgId, req.user, body);
  }

  @Post('decisions/recommend')
  @ApiOkResponse({ schema: envelopeSchema('AI decision recommendation result') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  recommendDecision(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: DecisionRecommendationRequest,
  ) {
    return this.aiGateway.recommendDecision(orgId, req.user, body);
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
