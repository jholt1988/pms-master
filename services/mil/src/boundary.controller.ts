import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "./prisma.service";

@ApiTags("boundary")
@Controller("boundary")
export class BoundaryController {
  constructor(private prisma: PrismaService) {}

  @Post("run")
  async run(@Body() body: { boundary_tag: string; tenant_id?: string }) {
    const boundary = body.boundary_tag ?? "weekly";
    const tf = body.tenant_id ? { tenantId: body.tenant_id } : {};

    const edgeCandidates = await this.prisma.crossRiskTenantEdgeOverlay.findMany({ where: { status: "CANDIDATE", ...tf }, take: 200 });
    const activated_edges: any[] = [];
    for (const c of edgeCandidates) {
      await this.prisma.crossRiskTenantEdgeOverlay.updateMany({ where: { tenantId: c.tenantId, edge: c.edge, status: "ACTIVE" }, data: { status: "RETIRED" } });
      const upd = await this.prisma.crossRiskTenantEdgeOverlay.update({ where: { id: c.id }, data: { status: "ACTIVE" } });
      await this.prisma.auditEvent.create({ data: { tenantId: upd.tenantId, type: "EDGE_OVERLAY_ACTIVATED_AT_BOUNDARY", payload: { overlayId: upd.id, edge: upd.edge, boundary } } });
            activated_edges.push({ id: upd.id, tenantId: upd.tenantId, edge: upd.edge });
    }

    const sdCandidates = await this.prisma.pack.findMany({ where: { kind: "SECONDARY_DAMAGE_TENANT", status: "CANDIDATE", ...tf }, take: 200 });
    const activated_sd_packs: any[] = [];
    for (const p of sdCandidates) {
      await this.prisma.pack.updateMany({ where: { tenantId: p.tenantId, kind: "SECONDARY_DAMAGE_TENANT", status: "ACTIVE" }, data: { status: "RETIRED" } });
      const upd = await this.prisma.pack.update({ where: { id: p.id }, data: { status: "ACTIVE" } });
      await this.prisma.packActivation.create({ data: { tenantId: upd.tenantId, packId: upd.id, boundaryTag: boundary, reason: "SD_TENANT_PACK_ACTIVATION_AT_BOUNDARY" } });
      await this.prisma.auditEvent.create({ data: { tenantId: upd.tenantId ?? undefined, type: "SD_TENANT_PACK_ACTIVATED_AT_BOUNDARY", payload: { packId: upd.id, hash: upd.hash, boundary } } });
      activated_sd_packs.push({ id: upd.id, tenantId: upd.tenantId, hash: upd.hash });
    }

    await this.prisma.auditEvent.create({ data: { tenantId: body.tenant_id ?? undefined, type: "LIVE_BASELINE_RECOMPUTE_REQUESTED", payload: { boundary, scope: body.tenant_id ? "TENANT" : "ALL" } } });
    return { ok:true, boundary, activated_edges, activated_sd_packs };
  }
}
