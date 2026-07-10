import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Phase 2B: AI usage / cost meter endpoint.
 *
 * GET /api/ai-gateway/usage?days=30
 * Returns per-model token consumption and estimated costs for the org.
 * BYOK usage (user brought their own key) shows $0 cost on our side.
 */
@Controller('ai-gateway')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class AiUsageController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('usage')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @ApiOkResponse({ schema: envelopeSchema('AI usage / cost meter summary') })
  async getUsage(
    @OrgId() orgId: string,
    @Query('days') days?: string,
  ) {
    const daysNum = Math.min(Math.max(parseInt(days ?? '30', 10) || 30, 1), 365);

    const since = new Date();
    since.setDate(since.getDate() - daysNum);

    // Aggregate by provider + model
    const rows = await this.prisma.aiUsageMetric.groupBy({
      by: ['provider', 'model', 'byok'],
      where: {
        organizationId: orgId,
        recordedAt: { gte: since },
      },
      _sum: {
        promptTokens: true,
        completionTokens: true,
        totalTokens: true,
      },
      _count: { id: true },
    });

    // Simple cost estimation (approximate, real costs depend on provider pricing)
    const MODEL_PRICING: Record<string, { prompt: number; completion: number }> = {
      'gpt-4o-mini': { prompt: 0.15, completion: 0.60 },
      'gpt-4o': { prompt: 2.50, completion: 10.00 },
      default: { prompt: 0.50, completion: 1.50 },
    };

    const breakdown = rows.map((row) => {
      const pricing = MODEL_PRICING[row.model] ?? MODEL_PRICING.default;
      const promptCost =
        ((row._sum.promptTokens ?? 0) / 1_000_000) * pricing.prompt;
      const completionCost =
        ((row._sum.completionTokens ?? 0) / 1_000_000) * pricing.completion;
      return {
        provider: row.provider,
        model: row.model,
        byok: row.byok,
        requests: row._count.id,
        promptTokens: row._sum.promptTokens ?? 0,
        completionTokens: row._sum.completionTokens ?? 0,
        totalTokens: row._sum.totalTokens ?? 0,
        estimatedCostUsd: row.byok ? 0 : Math.round((promptCost + completionCost) * 100) / 100,
      };
    });

    const totalTokens = breakdown.reduce((sum, b) => sum + b.totalTokens, 0);
    const totalCost = breakdown.reduce((sum, b) => sum + b.estimatedCostUsd, 0);

    return {
      organizationId: orgId,
      periodDays: daysNum,
      since: since.toISOString(),
      totalTokens,
      totalEstimatedCostUsd: Math.round(totalCost * 100) / 100,
      breakdown,
    };
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
