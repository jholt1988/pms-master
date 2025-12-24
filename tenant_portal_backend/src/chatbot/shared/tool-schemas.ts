// shared/tool-schemas.ts
import { z } from "zod";
import {
  UUID,
  ISODate,
  ISODateTime,
  Address,
  Attachment,
  Channel,
  Direction,
  Priority,
  Severity,
  Trade,
  WorkOrderCategory,
  WorkOrderStatus,
  MoneyCents,
  ToolResponse,
  PropertyContext,
  UnitContext,
  TenantContext,
  LeaseSummary,
  WorkOrder,
  WorkOrderNote,
  Vendor,
  Communication,
  PricebookLaborRecord,
  PricebookMaterialRecord,
  Transaction,
} from "./schemas";

/** -----------------------------
 * Shared helpers
 * ----------------------------*/
export const DateRange = z.object({
  start: ISODate,
  end: ISODate,
});

export const MonthYYYYMM = z
  .string()
  .regex(/^\d{4}-\d{2}$/, "Expected YYYY-MM");

/** -----------------------------
 * Tool: get_property_context
 * ----------------------------*/
export const GetPropertyContextInput = z.object({
  property_id: UUID,
});
export const GetPropertyContextOutput = ToolResponse(PropertyContext);

/** -----------------------------
 * Tool: get_unit_context
 * ----------------------------*/
export const GetUnitContextInput = z.object({
  unit_id: UUID,
});
export const GetUnitContextOutput = ToolResponse(UnitContext);

/** -----------------------------
 * Tool: get_tenant_context
 * ----------------------------*/
export const GetTenantContextInput = z.object({
  tenant_id: UUID,
});
export const GetTenantContextOutput = ToolResponse(TenantContext);

/** -----------------------------
 * Tool: get_lease_summary
 * ----------------------------*/
export const GetLeaseSummaryInput = z
  .object({
    lease_id: UUID.optional(),
    tenant_id: UUID.optional(),
  })
  .refine((v) => v.lease_id || v.tenant_id, "Provide lease_id or tenant_id");
export const GetLeaseSummaryOutput = ToolResponse(LeaseSummary);

/** -----------------------------
 * Tool: search_work_orders
 * ----------------------------*/
export const SearchWorkOrdersInput = z.object({
  property_id: UUID,
  query: z.string().default(""),
  status: WorkOrderStatus.optional(),
  date_range: DateRange.optional(),
  limit: z.number().int().min(1).max(200).default(50),
});
export const SearchWorkOrdersData = z.object({
  results: z.array(WorkOrder),
});
export const SearchWorkOrdersOutput = ToolResponse(SearchWorkOrdersData);

/** -----------------------------
 * Tool: get_work_order
 * ----------------------------*/
export const GetWorkOrderInput = z.object({
  work_order_id: UUID,
});
export const GetWorkOrderOutput = ToolResponse(WorkOrder);

/** -----------------------------
 * Tool: create_work_order
 * ----------------------------*/
export const CreateWorkOrderInput = z.object({
  idempotency_key: z.string().optional(),

  property_id: UUID,
  unit_id: UUID.optional(),
  tenant_id: UUID.optional(),

  title: z.string().min(3),
  category: WorkOrderCategory.default("other"),
  priority: Priority.default("normal"),

  description: z.string().optional(),
  scope_notes: z.array(z.string()).default([]),
  attachments: z.array(Attachment).default([]),
  tags: z.array(z.string()).default([]),
});
export const CreateWorkOrderOutput = ToolResponse(WorkOrder);

/** -----------------------------
 * Tool: update_work_order
 * (Safe patch only; prevents agents from editing everything)
 * ----------------------------*/
export const WorkOrderPatch = z
  .object({
    title: z.string().min(3).optional(),
    category: WorkOrderCategory.optional(),
    priority: Priority.optional(),
    status: WorkOrderStatus.optional(),
    description: z.string().optional(),
    scope_notes: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),

    assigned_vendor_id: UUID.nullable().optional(),
    scheduled_window: z
      .object({
        start: ISODateTime,
        end: ISODateTime,
      })
      .nullable()
      .optional(),
  })
  .strict();

export const UpdateWorkOrderInput = z.object({
  work_order_id: UUID,
  patch: WorkOrderPatch,
});
export const UpdateWorkOrderOutput = ToolResponse(WorkOrder);

/** -----------------------------
 * Tool: add_work_order_note
 * ----------------------------*/
export const AddWorkOrderNoteInput = z.object({
  work_order_id: UUID,
  visibility: z.enum(["internal", "tenant"]).default("internal"),
  author: z.string().default("system"),
  note: z.string().min(1),
});
export const AddWorkOrderNoteOutput = ToolResponse(WorkOrderNote);

/** -----------------------------
 * Tool: vendor_directory_lookup
 * ----------------------------*/
export const VendorDirectoryLookupInput = z.object({
  trade: Trade,
  zip: z.string().regex(/^\d{5}$/, "Expected 5-digit ZIP"),
  urgency: Priority.optional(),
  limit: z.number().int().min(1).max(50).default(10),
});
export const VendorDirectoryLookupData = z.object({
  vendors: z.array(Vendor),
});
export const VendorDirectoryLookupOutput = ToolResponse(VendorDirectoryLookupData);

/** -----------------------------
 * Tool: vendor_upsert (admin tool)
 * ----------------------------*/
export const VendorUpsertInput = z.object({
  vendor: Vendor,
});
export const VendorUpsertData = z.object({
  vendor_id: UUID,
  created: z.boolean(),
});
export const VendorUpsertOutput = ToolResponse(VendorUpsertData);

/** -----------------------------
 * Tool: draft_message
 * (Generic drafting tool used by TenantComms / LeaseUp)
 * ----------------------------*/
export const DraftMessageInput = z.object({
  channel: Channel,
  intent: z.string(), // "late_rent_notice", "access_notice", etc.
  tone: z.enum(["firm", "neutral", "friendly"]).default("neutral"),
  variables: z.record(z.any()).default({}), // templating vars
});
export const DraftMessageData = z.object({
  subject: z.string().optional(),
  body: z.string(),
  sms: z.string().optional(),
  key_points: z.array(z.string()).default([]),
  requested_info: z.array(z.string()).default([]),
  deadlines: z
    .array(z.object({ item: z.string(), by: ISODate }))
    .default([]),
});
export const DraftMessageOutput = ToolResponse(DraftMessageData);

/** -----------------------------
 * Tool: log_communication
 * ----------------------------*/
export const LogCommunicationInput = z.object({
  timestamp: ISODateTime.optional(), // if omitted, tool sets now()
  channel: Channel,
  direction: Direction,
  to: z.string(),
  from: z.string(),
  subject: z.string().optional(),
  message: z.string(),

  tenant_id: UUID.optional(),
  property_id: UUID.optional(),
  unit_id: UUID.optional(),
  work_order_id: UUID.optional(),
  tags: z.array(z.string()).default([]),
});
export const LogCommunicationOutput = ToolResponse(Communication);

/** -----------------------------
 * Tool: get_message_thread
 * ----------------------------*/
export const GetMessageThreadInput = z.object({
  tenant_id: UUID,
  limit: z.number().int().min(1).max(200).default(50),
});
export const GetMessageThreadData = z.object({
  communications: z.array(Communication),
});
export const GetMessageThreadOutput = ToolResponse(GetMessageThreadData);

/** -----------------------------
 * Tool: search_labor_rates (v1: internal pricebook)
 * ----------------------------*/
export const SearchLaborRatesInput = z.object({
  trade: Trade,
  zip: z.string().regex(/^\d{5}$/, "Expected 5-digit ZIP"),
  task: z.string().min(2),
});
export const SearchLaborRatesData = z.object({
  trade: Trade,
  task: z.string(),
  zip: z.string(),
  hourly_low_cents: MoneyCents,
  hourly_high_cents: MoneyCents,
  basis: z.enum(["pricebook", "historical", "manual"]).default("pricebook"),
  source_note: z.string().default("internal pricebook"),
  updated_at: ISODateTime.optional(),
});
export const SearchLaborRatesOutput = ToolResponse(SearchLaborRatesData);

/** -----------------------------
 * Tool: get_material_price (v1: internal pricebook)
 * ----------------------------*/
export const GetMaterialPriceInput = z.object({
  item: z.string().min(2),
  qty: z.number().positive(),
  unit: z.string().optional(), // "each", "ft", "sqft", ...
  zip: z.string().regex(/^\d{5}$/, "Expected 5-digit ZIP").optional(),
});
export const GetMaterialPriceData = z.object({
  item: z.string(),
  qty: z.number().positive(),
  unit: z.string().default("each"),
  unit_price_cents: MoneyCents,
  total_cents: MoneyCents,
  availability: z.enum(["unknown", "in_stock", "out_of_stock"]).default("unknown"),
  basis: z.enum(["pricebook", "historical", "manual"]).default("pricebook"),
  source_note: z.string().default("internal pricebook"),
  updated_at: ISODateTime.optional(),
});
export const GetMaterialPriceOutput = ToolResponse(GetMaterialPriceData);

/** -----------------------------
 * Tool: pricebook_upsert (admin tool)
 * ----------------------------*/
export const PricebookUpsertInput = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("labor"),
    record: PricebookLaborRecord,
  }),
  z.object({
    type: z.literal("material"),
    record: PricebookMaterialRecord,
  }),
]);

export const PricebookUpsertData = z.object({
  type: z.enum(["labor", "material"]),
  id: UUID,
  created: z.boolean(),
});
export const PricebookUpsertOutput = ToolResponse(PricebookUpsertData);

/** -----------------------------
 * Tool: import_transactions (v1: CSV)
 * ----------------------------*/
export const ImportTransactionsInput = z.object({
  source: z.literal("csv"),
  file_id: z.string(),
  default_property_id: UUID.optional(),
  imported_by: z.string().default("system"),
});
export const ImportTransactionsData = z.object({
  imported_count: z.number().int().nonnegative(),
  transaction_ids: z.array(UUID),
});
export const ImportTransactionsOutput = ToolResponse(ImportTransactionsData);

/** -----------------------------
 * Tool: fetch_transactions
 * ----------------------------*/
export const FetchTransactionsInput = z.object({
  date_range: DateRange,
  property_id: UUID.optional(),
  limit: z.number().int().min(1).max(2000).default(500),
});
export const FetchTransactionsData = z.object({
  transactions: z.array(Transaction),
});
export const FetchTransactionsOutput = ToolResponse(FetchTransactionsData);

/** -----------------------------
 * Tool: categorize_transaction
 * ----------------------------*/
export const CategorizeTransactionInput = z.object({
  transaction_id: UUID,
  category: z.string().min(2),
  property_id: UUID.optional(),
  notes: z.string().optional(),
  confidence: z.number().min(0).max(1).default(0.7),
});
export const CategorizeTransactionData = z.object({
  transaction: Transaction,
});
export const CategorizeTransactionOutput = ToolResponse(CategorizeTransactionData);

/** -----------------------------
 * Tool: generate_pnl
 * ----------------------------*/
export const GeneratePnLInput = z.object({
  month: MonthYYYYMM,
  by_property: z.boolean().default(true),
  by_category: z.boolean().default(true),
});

export const GeneratePnLData = z.object({
  month: MonthYYYYMM,
  by_property: z
    .array(
      z.object({
        property_id: UUID,
        income_cents: MoneyCents,
        expenses_cents: MoneyCents,
        net_cents: z.number().int(), // can be negative
      })
    )
    .default([]),
  by_category: z
    .array(
      z.object({
        category: z.string(),
        total_cents: z.number().int(), // can be negative for refunds/adjustments
      })
    )
    .default([]),
});
export const GeneratePnLOutput = ToolResponse(GeneratePnLData);

/** -----------------------------
 * Tool: flag_anomaly (optional)
 * ----------------------------*/
export const FlagAnomalyInput = z.object({
  transaction_id: UUID,
  reason: z.string().min(3),
  severity: z.enum(["low", "medium", "high"]).default("medium"),
});
export const FlagAnomalyData = z.object({
  flagged: z.boolean(),
});
export const FlagAnomalyOutput = ToolResponse(FlagAnomalyData);

/** -----------------------------
 * Optional: Tool registry shape (handy for wiring)
 * ----------------------------*/
export const ToolName = z.enum([
  "get_property_context",
  "get_unit_context",
  "get_tenant_context",
  "get_lease_summary",
  "search_work_orders",
  "get_work_order",
  "create_work_order",
  "update_work_order",
  "add_work_order_note",
  "vendor_directory_lookup",
  "vendor_upsert",
  "draft_message",
  "log_communication",
  "get_message_thread",
  "search_labor_rates",
  "get_material_price",
  "pricebook_upsert",
  "import_transactions",
  "fetch_transactions",
  "categorize_transaction",
  "generate_pnl",
  "flag_anomaly",
]);

export type ToolNameT = z.infer<typeof ToolName>;
