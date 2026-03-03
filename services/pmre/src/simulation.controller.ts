import { Body, Controller, Post } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { PrismaService } from "./prisma.service";

function mulberry32(seed: number) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
function randNormal(rng: ()=>number) {
  let u=0,v=0; while(u===0)u=rng(); while(v===0)v=rng();
  return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v);
}
function randLogNormal(rng: ()=>number, median: number, sigma: number): number {
  const mu = Math.log(Math.max(1e-6, median));
  return Math.exp(mu + sigma*randNormal(rng));
}
function percentile(xs: number[], p: number): number {
  const a=[...xs].sort((x,y)=>x-y); if(a.length===0) return 0;
  const idx=(p/100)*(a.length-1); const lo=Math.floor(idx), hi=Math.ceil(idx);
  if(lo===hi) return a[lo]; const t=idx-lo; return a[lo]*(1-t)+a[hi]*t;
}

type QuantEntry = { event_type: string; vintage_bucket: string; class_bucket: string; quantiles_usd: {p50:number;p75:number;p90:number;p95:number;p99:number}; neff:number; };

function resolve(entries: QuantEntry[], ev: string, v: string, c: string): QuantEntry | null {
  return entries.find(e=>e.event_type===ev && e.vintage_bucket===v && e.class_bucket===c)
    ?? entries.find(e=>e.event_type===ev && e.vintage_bucket===v && e.class_bucket==="ALL")
    ?? entries.find(e=>e.event_type===ev && e.vintage_bucket==="ALL" && e.class_bucket===c)
    ?? entries.find(e=>e.event_type===ev && e.vintage_bucket==="ALL" && e.class_bucket==="ALL")
    ?? null;
}
function sampleQuant(rng: ()=>number, q: any): number {
  const u=rng();
  const pts=[{u:0,x:0},{u:0.5,x:q.p50},{u:0.75,x:q.p75},{u:0.9,x:q.p90},{u:0.95,x:q.p95},{u:0.99,x:q.p99}];
  for(let i=0;i<pts.length-1;i++){
    const a=pts[i], b=pts[i+1];
    if(u>=a.u && u<=b.u){ const t=(u-a.u)/(b.u-a.u); return a.x*(1-t)+b.x*t; }
  }
  const a=pts[pts.length-2], b=pts[pts.length-1];
  const slope=(b.x-a.x)/(b.u-a.u);
  return b.x + slope*(u-b.u);
}

const GLOBAL_DEFAULTS: QuantEntry[] = [
  { event_type:"LEAK_WATER_DAMAGE", vintage_bucket:"ALL", class_bucket:"ALL",
    quantiles_usd:{p50:500,p75:900,p90:1800,p95:3000,p99:7000}, neff:999 },
  { event_type:"COMPRESSOR_ESCALATION", vintage_bucket:"ALL", class_bucket:"ALL",
    quantiles_usd:{p50:800,p75:1500,p90:2800,p95:4500,p99:10000}, neff:999 },
];

@ApiTags("simulation")
@Controller("simulation")
export class SimulationController {
  constructor(private prisma: PrismaService) {}

  async getEntries(tenantId?: string): Promise<QuantEntry[]> {
    if(!tenantId) return GLOBAL_DEFAULTS;
    const pack = await this.prisma.pack.findFirst({ where:{ tenantId, kind:"SECONDARY_DAMAGE_TENANT", status:"ACTIVE" }, orderBy:{ createdAt:"desc" } });
    if(!pack) return GLOBAL_DEFAULTS;
    const payload:any = pack.payloadJson;
    return (payload.quantiles ?? []) as QuantEntry[];
  }

  @Post("portfolio")
  async simulate(@Body() body: any) {
    const horizonDays=Number(body.horizon_days ?? 90);
    const runs=Number(body.runs ?? 2000);
    const seed=Number(body.seed ?? 12345);
    const baseProb=Math.max(0, Math.min(1, Number(body.base_event_probability ?? 0.2)));
    const secHazardPerDay=Math.max(0, Number(body.secondary_hazard_per_day ?? 0.01));
    const vintage=(body.vintage_bucket ?? "UNKNOWN") as string;
    const cls=(body.class_bucket ?? "UNKNOWN") as string;
    const tenantId=body.tenant_id as string|undefined;

    const entries=await this.getEntries(tenantId);

    const rng=mulberry32(seed);
    const losses:number[]=[];
    let primary=0, secondary=0;

    const dispatchMedian=5, partsMedian=7, dispatchSigma=0.45, partsSigma=0.55;
    const shock=body.vendor_shock ?? null;
    const dMedMult=shock?.dispatch_median_multiplier ?? 1.0;
    const dSigAdd=shock?.dispatch_tail_sigma_add ?? 0.0;
    const pMedMult=shock?.parts_median_multiplier ?? 1.0;
    const pSigAdd=shock?.parts_tail_sigma_add ?? 0.0;

    for(let i=0;i<runs;i++){
      let loss=0;
      if(rng()<baseProb){
        primary++;
        const dDispatch=randLogNormal(rng, dispatchMedian*dMedMult, dispatchSigma+dSigAdd);
        const dParts=randLogNormal(rng, partsMedian*pMedMult, partsSigma+pSigAdd);
        const unresolved=Math.max(0, Math.min(horizonDays, dDispatch+dParts));
        const pSec=1 - Math.pow(1-secHazardPerDay, Math.floor(unresolved));
        if(rng()<pSec){
          secondary++;
          const ev = (rng()<0.5) ? "LEAK_WATER_DAMAGE" : "COMPRESSOR_ESCALATION";
          const entry = resolve(entries, ev, vintage, cls) ?? resolve(GLOBAL_DEFAULTS, ev, "ALL", "ALL")!;
          loss += sampleQuant(rng, entry.quantiles_usd);
        }
        loss += 350;
      }
      losses.push(loss);
    }

    const mean=losses.reduce((a,b)=>a+b,0)/losses.length;
    return {
      ok:true, runs, horizon_days:horizonDays, seed,
      primary_event_rate: primary/runs,
      secondary_event_rate: secondary/runs,
      loss_mean: mean,
      loss_p50: percentile(losses,50),
      loss_p75: percentile(losses,75),
      loss_p90: percentile(losses,90),
      loss_p95: percentile(losses,95),
      loss_p99: percentile(losses,99),
      severity_pack_used: tenantId ? "TENANT_OR_FALLBACK" : "GLOBAL_DEFAULTS"
    };
  }
}
