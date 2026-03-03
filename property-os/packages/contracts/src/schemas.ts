import { z } from "zod";
export const BuildingVintageBucketSchema = z.enum(["PRE_1970","1970_1989","1990_2009","2010_PLUS","UNKNOWN"]);
export const PropertyClassBucketSchema = z.enum(["A","B","C","UNKNOWN"]);
export const SecondaryDamageOutcomeSchema = z.object({
  tenant_id: z.string().min(1),
  property_id: z.string().optional(),
  unit_id: z.string().optional(),
  asset_group: z.enum(["HVAC","WATER_HEATER"]),
  event_type: z.string().min(1),
  occurred_at: z.string().datetime(),
  direct_cost_usd: z.number().nonnegative(),
  downtime_days: z.number().int().nonnegative().optional(),
  vintage_bucket: BuildingVintageBucketSchema.optional(),
  class_bucket: PropertyClassBucketSchema.optional(),
  bundle_hash: z.string().optional(),
  taxonomy_version: z.string().optional()
});
