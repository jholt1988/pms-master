// shared/schemas.ts
import { z } from "zod";

/** -----------------------------
 *  Primitives / Helpers
 *  ----------------------------*/
export const UUID = z.string().uuid();
export const ISODate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const ISODateTime = z
  .string()
  .datetime({ offset: true })
  .or(z.string().datetime({ offset: false })); // allow both if you’re not strict yet

export const CurrencyCode = z.enum(["USD"]); // expand later if needed

// Money in cents to avoid float bugs.
export const MoneyCents = z.number().int().nonnegative();

export const PhoneE164 = z
  .string()
  .regex(/^\+?[1-9]\d{7,14}$/, "Expected E.164-ish phone number");

export const Email = z.string().email();

export const Channel = z.enum(["ui", "sms", "email", "internal"]);
export const Direction = z.enum(["inbound", "outbound"]);

export const Priority = z.enum(["low", "normal", "high", "urgent"]);
export const Severity = z.enum(["low", "medium", "high", "emergency"]);

export const Trade = z.enum([
  "plumbing",
  "electrical",
  "hvac",
  "appliance",
  "pest",
  "roofing",
  "general",
  "landscaping",
  "locksmith",
  "cleaning",
  "structural",
]);

export const WorkOrderCategory = z.enum([
  "plumbing",
  "electrical",
  "hvac",
  "appliance",
  "pest",
  "roofing",
  "locksmith",
  "cleaning",
  "landscaping",
  "structural",
  "general",
  "other",
]);

export const WorkOrderStatus = z.enum([
  "new",
  "triaged",
  "scheduled",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
]);

export const Attachment = z.object({
  file_id: z.string(), // internal file id
  filename: z.string(),
  mime_type: z.string().optional(),
  size_bytes: z.number().int().nonnegative().optional(),
  url: z.string().url().optional(), // optional if you store externally later
  tags: z.array(z.string()).optional(),
});

export const Address = z.object({
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  state: z.string().min(2).max(2),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, "Expected US ZIP"),
});

/** -----------------------------
 *  Tool response envelope
 *  ----------------------------*/
export const SourceRef = z.object({
  type: z.enum(["db", "url", "vendor", "manual"]),
  ref: z.string(),
  note: z.string().optional(),
});

export const ToolMeta = z.object({
  trace_id: z.string(),
  sources: z.array(SourceRef).default([]),
  latency_ms: z.number().int().nonnegative().default(0),
});

export const ToolError = z.object({
  code: z.string(),
  message: z.string(),
  retryable: z.boolean().default(false),
});

export const ToolResponse = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), data: dataSchema, meta: ToolMeta }),
    z.object({ ok: z.literal(false), error: ToolError, meta: ToolMeta }),
  ]);

/** -----------------------------
 *  Core Entities
 *  ----------------------------*/
export const PropertyContext = z.object({
  property_id: UUID,
  address: Address,
  property_type: z.enum(["single_family", "multi_family", "commercial", "other"]).default("other"),
  year_built: z.number().int().min(1700).max(2500).optional(),
  units_count: z.number().int().positive().optional(),
  timezone: z.string().default("America/Chicago"),
  notes: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  utility_shutoffs: z
    .object({
      water: z.string().optional(),
      gas: z.string().optional(),
      electric: z.string().optional(),
    })
    .optional(),
});

export const UnitContext = z.object({
  unit_id: UUID,
  property_id: UUID,
  unit_label: z.string(), // “1A”, “Upstairs”, etc.
  beds: z.number().nonnegative().optional(),
  baths: z.number().nonnegative().optional(),
  sqft: z.number().int().positive().optional(),
  occupancy_status: z.enum(["vacant", "occupied", "unknown"]).default("unknown"),
  availability_date: ISODate.optional(),
  rent_target_cents: MoneyCents.optional(),
  amenities: z.array(z.string()).default([]),
  photos: z.array(Attachment).default([]),
  notes: z.array(z.string()).default([]),
});

export const TenantContext = z.object({
  tenant_id: UUID,
  full_name: z.string(),
  phone: PhoneE164.optional(),
  email: Email.optional(),
  preferred_channel: Channel.default("sms"),
  language: z.string().default("en"),
  property_id: UUID.optional(),
  unit_id: UUID.optional(),
  lease_id: UUID.optional(),
  move_in_date: ISODate.optional(),
  move_out_date: ISODate.optional(),
  balance_due_cents: MoneyCents.optional(),
  flags: z.array(z.string()).default([]), // e.g. “do_not_call”, “hostile”, “payment_plan”
});

export const LeaseClause = z.object({
  clause_key: z.string(), // e.g. "LATE_FEE", "ENTRY_NOTICE", "PETS"
  summary: z.string(),
});

export const LeaseSummary = z.object({
  lease_id: UUID,
  property_id: UUID,
  unit_id: UUID,
  tenant_id: UUID,
  start_date: ISODate,
  end_date: ISODate.optional(),
  rent_amount_cents: MoneyCents,
  rent_due_day: z.number().int().min(1).max(31).default(1),
  grace_period_days: z.number().int().min(0).max(31).default(0),
  late_fee_cents: MoneyCents.optional(),
  pet_policy: z.string().optional(),
  smoking_policy: z.string().optional(),
  access_notice_hours: z.number().int().min(0).max(168).optional(),
  clauses: z.array(LeaseClause).default([]),
});

export const TimeWindow = z.object({
  start: ISODateTime,
  end: ISODateTime,
});

export const WorkOrder = z.object({
  work_order_id: UUID,
  property_id: UUID,
  unit_id: UUID.optional(),
  tenant_id: UUID.optional(),
  title: z.string(),
  category: WorkOrderCategory.default("other"),
  priority: Priority.default("normal"),
  status: WorkOrderStatus.default("new"),
  description: z.string().optional(),
  scope_notes: z.array(z.string()).default([]),
  attachments: z.array(Attachment).default([]),

  assigned_vendor_id: UUID.optional(),
  scheduled_window: TimeWindow.optional(),

  created_at: ISODateTime,
  updated_at: ISODateTime,
  tags: z.array(z.string()).default([]),
});

export const WorkOrderNote = z.object({
  note_id: UUID,
  work_order_id: UUID,
  created_at: ISODateTime,
  author: z.string().default("system"),
  visibility: z.enum(["internal", "tenant"]).default("internal"),
  note: z.string(),
});

export const Vendor = z.object({
  vendor_id: UUID,
  name: z.string(),
  trades: z.array(Trade).default(["general"]),
  service_zips: z.array(z.string()).default([]),
  phone: PhoneE164.optional(),
  email: Email.optional(),
  preferred_contact: z.enum(["sms", "email", "phone"]).default("email"),
  emergency_service: z.boolean().default(false),
  insurance_on_file: z.boolean().default(false),
  notes: z.array(z.string()).default([]),
});

export const Communication = z.object({
  communication_id: UUID,
  timestamp: ISODateTime,
  channel: Channel,
  direction: Direction,
  to: z.string(),   // phone or email or user id
  from: z.string(), // phone or email or system label
  subject: z.string().optional(),
  message: z.string(),
  tenant_id: UUID.optional(),
  property_id: UUID.optional(),
  unit_id: UUID.optional(),
  work_order_id: UUID.optional(),
  tags: z.array(z.string()).default([]),
});

export const PricebookLaborRecord = z.object({
  labor_id: UUID,
  trade: Trade,
  task: z.string(),
  region_zip: z.string().regex(/^\d{5}$/, "Expected 5-digit ZIP"),
  hourly_low_cents: MoneyCents,
  hourly_high_cents: MoneyCents,
  updated_at: ISODateTime,
  source_note: z.string().default("internal pricebook"),
});

export const PricebookMaterialRecord = z.object({
  material_id: UUID,
  item: z.string(),
  unit: z.string(), // "each", "ft", "sqft", "gal", etc.
  region_zip: z.string().regex(/^\d{5}$/).optional(),
  unit_price_cents: MoneyCents,
  updated_at: ISODateTime,
  source_note: z.string().default("internal pricebook"),
});

export const Transaction = z.object({
  transaction_id: UUID,
  date: ISODate,
  vendor: z.string(),
  amount_cents: MoneyCents,
  memo: z.string().optional(),
  property_id: UUID.optional(),
  category: z.string().optional(),
  confidence: z.number().min(0).max(1).optional(),
});

/** -----------------------------
 *  Orchestrator shared types
 *  ----------------------------*/
export const RouteTo = z.enum([
  "RepairEstimator",
  "MaintenanceTriage",
  "TenantComms",
  "LeaseUp",
  "Bookkeeping",
  "HumanEscalation",
]);

export const OrchestratorOutput = z.object({
  route_to: RouteTo,
  reason: z.string(),
  missing_inputs: z.array(z.string()).default([]),
  priority: Priority,
  recommended_next_action: z.string(),
  handoff_payload: z.record(z.any()).default({}),
});

export type PropertyContextT = z.infer<typeof PropertyContext>;
export type UnitContextT = z.infer<typeof UnitContext>;
export type TenantContextT = z.infer<typeof TenantContext>;
export type LeaseSummaryT = z.infer<typeof LeaseSummary>;
export type WorkOrderT = z.infer<typeof WorkOrder>;
export type VendorT = z.infer<typeof Vendor>;
export type CommunicationT = z.infer<typeof Communication>;
export type TransactionT = z.infer<typeof Transaction>;
export type OrchestratorOutputT = z.infer<typeof OrchestratorOutput>;