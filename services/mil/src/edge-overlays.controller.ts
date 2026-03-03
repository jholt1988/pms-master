import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "./prisma.service";

@ApiTags("edge-overlays")
@Controller("edge-overlays")
export class EdgeOverlaysController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async list(@Query("tenantId") tenantId?: string) {
    const overlays = await this.prisma.crossRiskTenantEdgeOverlay.findMany({
      where: tenantId ? { tenantId } : {},
      orderBy: { createdAt: "desc" },
      take: 100
    });
    return { overlays };
  }

  @Post("candidate")
  async createCandidate(@Body() body: any) {
    const tenantId = body.tenant_id;
    const edge = body.edge;
    const hasActive = await this.prisma.crossRiskTenantEdgeOverlay.findFirst({ where: { tenantId, edge, status: "ACTIVE" } });
    const status = hasActive ? "CANDIDATE" : "PENDING_FIRST_APPROVAL";

    const overlay = await this.prisma.crossRiskTenantEdgeOverlay.create({
      data: {
        tenantId,
        edge,
        parentPackHash: body.parent_pack_hash ?? "global",
        version: body.version ?? "0.1.0",
        status,
        deltaBeta: body.delta_beta ?? 0,
        deltaAlpha: body.delta_alpha ?? 0,
        windowDays: body.window_days ?? 365,
        decayLambda: body.decay_lambda ?? (Math.log(2)/365),
        neff: body.neff ?? 0,
        metricsJson: body.metrics ?? {}
      }
    });

    await this.prisma.auditEvent.create({ data: { tenantId, type: "EDGE_OVERLAY_CANDIDATE_CREATED", payload: { overlayId: overlay.id, edge, status } } });
    return { ok:true, overlay };
  }

  @Post(":id/approve-first")
  async approveFirst(@Param("id") id: string) {
    const overlay = await this.prisma.crossRiskTenantEdgeOverlay.findUnique({ where: { id } });
    if (!overlay) return { ok:false, error:"NOT_FOUND" };
    if (overlay.status !== "PENDING_FIRST_APPROVAL") return { ok:false, error:"NOT_PENDING_FIRST_APPROVAL" };
    const updated = await this.prisma.crossRiskTenantEdgeOverlay.update({ where: { id }, data: { status: "CANDIDATE" } });
    await this.prisma.auditEvent.create({ data: { tenantId: updated.tenantId, type: "EDGE_OVERLAY_FIRST_APPROVED", payload: { overlayId: id, edge: updated.edge } } });
    return { ok:true, overlay: updated };
  }
}
