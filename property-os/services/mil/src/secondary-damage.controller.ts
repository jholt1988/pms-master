import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "./prisma.service";
import { SecondaryDamageOutcomeSchema } from "@propertyos/contracts";

function hashOf(obj: any): string {
  const s = JSON.stringify(obj);
  let h = 2166136261;
  for (let i=0;i<s.length;i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return "fnv1a_" + (h>>>0).toString(16);
}

type OutcomeRow = { cost: number; weight: number };

function weightedQuantile(rows: OutcomeRow[], q: number): number {
  if (rows.length === 0) return 0;
  const sorted = [...rows].sort((a,b)=>a.cost-b.cost);
  const totalW = sorted.reduce((s,r)=>s+r.weight,0);
  if (totalW <= 0) return sorted[sorted.length-1].cost;
  let acc = 0;
  for (const r of sorted) {
    acc += r.weight;
    if (acc / totalW >= q) return r.cost;
  }
  return sorted[sorted.length-1].cost;
}

function neffFromWeights(weights: number[]): number {
  const sw = weights.reduce((a,b)=>a+b,0);
  const sw2 = weights.reduce((a,b)=>a+b*b,0);
  if (sw2 === 0) return 0;
  return (sw*sw)/sw2;
}

@ApiTags("secondary-damage")
@Controller("secondary-damage")
export class SecondaryDamageController {
  constructor(private prisma: PrismaService) {}

  @Post("outcomes")
  async ingest(@Body() body: any) {
    const parsed = SecondaryDamageOutcomeSchema.parse(body);
    const created = await this.prisma.secondaryDamageOutcome.create({
      data: {
        tenantId: parsed.tenant_id,
        propertyId: parsed.property_id ?? null,
        unitId: parsed.unit_id ?? null,
        assetGroup: parsed.asset_group,
        eventType: parsed.event_type,
        occurredAt: new Date(parsed.occurred_at),
        directCostUsd: parsed.direct_cost_usd,
        downtimeDays: parsed.downtime_days ?? null,
        vintageBucket: (parsed.vintage_bucket ?? "UNKNOWN") as any,
        classBucket: (parsed.class_bucket ?? "UNKNOWN") as any,
        bundleHash: parsed.bundle_hash ?? null,
        taxonomyVersion: parsed.taxonomy_version ?? null
      }
    });
    await this.prisma.auditEvent.create({ data: { tenantId: created.tenantId, type: "SD_OUTCOME_INGESTED", payload: { id: created.id, eventType: created.eventType, cost: created.directCostUsd } } });
    return { ok:true, outcome: created };
  }

  @Get("packs")
  async listPacks(@Query("tenantId") tenantId?: string) {
    const packs = await this.prisma.pack.findMany({
      where: { kind: "SECONDARY_DAMAGE_TENANT", ...(tenantId ? { tenantId } : {}) },
      orderBy: { createdAt: "desc" },
      take: 50
    });
    return { packs };
  }

  @Post("packs/generate")
  async generateTenantPack(@Body() body: { tenant_id: string; version?: string; half_life_days?: number }) {
    const tenantId = body.tenant_id;
    const now = new Date();
    const windowDays = 730;
    const start = new Date(now.getTime() - windowDays*24*3600*1000);
    const halfLife = Math.max(180, Math.min(900, body.half_life_days ?? 540));
    const lambda = Math.log(2)/halfLife;

    const outcomes = await this.prisma.secondaryDamageOutcome.findMany({ where: { tenantId, occurredAt: { gte: start, lte: now } } });

    const minNeffKey = 30;
    const minNeffEvent = 50;

    const byKey = new Map<string, { rows: OutcomeRow[], event: string, vintage: string, cls: string }>();
    const byEvent = new Map<string, { rows: OutcomeRow[], event: string }>();

    for (const o of outcomes) {
      const ageDays = (now.getTime() - o.occurredAt.getTime())/(24*3600*1000);
      const w = Math.exp(-lambda*ageDays);
      const vintage = (o.vintageBucket as any) ?? "UNKNOWN";
      const cls = (o.classBucket as any) ?? "UNKNOWN";
      const key = `${o.eventType}|${vintage}|${cls}`;

      if (!byKey.has(key)) byKey.set(key, { rows: [], event: o.eventType, vintage, cls });
      byKey.get(key)!.rows.push({ cost: o.directCostUsd, weight: w });

      if (!byEvent.has(o.eventType)) byEvent.set(o.eventType, { rows: [], event: o.eventType });
      byEvent.get(o.eventType)!.rows.push({ cost: o.directCostUsd, weight: w });
    }

    const quantiles: any[] = [];

    for (const [ev, obj] of byEvent.entries()) {
      const weights = obj.rows.map(r=>r.weight);
      const neff = neffFromWeights(weights);
      if (neff < minNeffEvent) continue;
      quantiles.push({
        event_type: ev,
        vintage_bucket: "ALL",
        class_bucket: "ALL",
        quantiles_usd: {
          p50: weightedQuantile(obj.rows, 0.50),
          p75: weightedQuantile(obj.rows, 0.75),
          p90: weightedQuantile(obj.rows, 0.90),
          p95: weightedQuantile(obj.rows, 0.95),
          p99: weightedQuantile(obj.rows, 0.99),
        },
        neff
      });
    }

    for (const [k, obj] of byKey.entries()) {
      const weights = obj.rows.map(r=>r.weight);
      const neff = neffFromWeights(weights);
      if (neff < minNeffKey) continue;
      quantiles.push({
        event_type: obj.event,
        vintage_bucket: obj.vintage,
        class_bucket: obj.cls,
        quantiles_usd: {
          p50: weightedQuantile(obj.rows, 0.50),
          p75: weightedQuantile(obj.rows, 0.75),
          p90: weightedQuantile(obj.rows, 0.90),
          p95: weightedQuantile(obj.rows, 0.95),
          p99: weightedQuantile(obj.rows, 0.99),
        },
        neff
      });
    }

    const packPayload = {
      tenant_id: tenantId,
      version: body.version ?? "sd_tenant_0.1.0",
      window_days: windowDays,
      decay_lambda: lambda,
      min_neff_key: minNeffKey,
      min_neff_event: minNeffEvent,
      quantiles,
      backoff_order: ["event+vintage+class","event+vintage","event+class","event"]
    };

    const packHash = hashOf(packPayload);
    const hasActive = await this.prisma.pack.findFirst({ where: { tenantId, kind: "SECONDARY_DAMAGE_TENANT", status: "ACTIVE" } });
    const status = hasActive ? "CANDIDATE" : "PENDING_FIRST_APPROVAL";

    const pack = await this.prisma.pack.create({
      data: { tenantId, kind: "SECONDARY_DAMAGE_TENANT", version: packPayload.version, hash: packHash, status, payloadJson: packPayload }
    });
    await this.prisma.auditEvent.create({ data: { tenantId, type: "SD_TENANT_PACK_GENERATED", payload: { packId: pack.id, hash: pack.hash, status, outcomes_count: outcomes.length } } });
    return { ok:true, pack };
  }

  @Post("packs/:packId/approve-first")
  async approveFirst(@Param("packId") packId: string) {
    const pack = await this.prisma.pack.findUnique({ where: { id: packId } });
    if (!pack) return { ok:false, error:"NOT_FOUND" };
    if (pack.kind !== "SECONDARY_DAMAGE_TENANT") return { ok:false, error:"WRONG_KIND" };
    if (pack.status !== "PENDING_FIRST_APPROVAL") return { ok:false, error:"NOT_PENDING_FIRST_APPROVAL" };

    const updated = await this.prisma.pack.update({ where: { id: packId }, data: { status: "CANDIDATE" } });
    await this.prisma.auditEvent.create({ data: { tenantId: updated.tenantId ?? undefined, type: "SD_TENANT_PACK_FIRST_APPROVED", payload: { packId } } });
    return { ok:true, pack: updated };
  }
}
