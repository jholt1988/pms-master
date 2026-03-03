import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "./prisma.service";

@ApiTags("intents")
@Controller("intents")
export class IntentsController {
  constructor(private prisma: PrismaService) {}

  @Post("upsert")
  async upsert(@Body() body: any) {
    const maxSpend = Number(process.env.MAX_DAILY_AUTOSPEND_USD ?? 1000);
    const estCost = Number(body.estimated_cost_usd ?? 0);

    let status = body.status ?? "DETECTED";
    if ((body.tier === "TIER_1" || body.tier === "TIER_2") && estCost <= maxSpend) status = "EXECUTED";
    if ((body.tier === "TIER_1" || body.tier === "TIER_2") && estCost > maxSpend) {
      status = "QUEUED";
      await this.prisma.auditEvent.create({ data: { tenantId: body.tenant_id, type: "AUTONOMY_SPEND_CAP_BLOCK", payload: { estCost, maxSpend } } });
    }

    const intent = await this.prisma.actionIntent.create({
      data: {
        tenantId: body.tenant_id,
        propertyId: body.property_id ?? null,
        unitId: body.unit_id ?? null,
        riskType: body.risk_type ?? "maintenance",
        horizonDays: body.horizon_days ?? 90,
        percentile: body.percentile ?? 50,
        rawProbability: body.raw_probability ?? 0.1,
        expectedLoss90d: body.expected_loss_90d ?? null,
        amplified: Boolean(body.amplified ?? false),
        recommendedAction: body.recommended_action ?? "NOOP",
        priorityScore: body.priority_score ?? 0.5,
        tier: body.tier ?? "TIER_2",
        status,
        bundleHash: body.bundle_hash ?? null,
        governanceJson: body.governance ?? {},
      }
    });

    return { ok:true, intent };
  }
}
