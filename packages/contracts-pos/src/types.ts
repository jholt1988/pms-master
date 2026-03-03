export type BuildingVintageBucket = "PRE_1970"|"1970_1989"|"1990_2009"|"2010_PLUS"|"UNKNOWN";
export type PropertyClassBucket = "A"|"B"|"C"|"UNKNOWN";
export interface SecondaryDamageOutcomeDTO {
  tenant_id: string;
  property_id?: string;
  unit_id?: string;
  asset_group: "HVAC"|"WATER_HEATER";
  event_type: string;
  occurred_at: string;
  direct_cost_usd: number;
  downtime_days?: number;
  vintage_bucket?: BuildingVintageBucket;
  class_bucket?: PropertyClassBucket;
  bundle_hash?: string;
  taxonomy_version?: string;
}
