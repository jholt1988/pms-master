import { z } from "zod";
import { randomUUID } from "crypto";
import type { PrismaClient } from "@prisma/client";
import { AGENT_NAMES, type AgentName } from "../shared/constants";
import type { ToolContext } from "./tool-context";
import {
  ToolName,
  GetPropertyContextInput,
  GetPropertyContextOutput,
  GetUnitContextInput,
  GetUnitContextOutput,
  GetTenantContextInput,
  GetTenantContextOutput,
  GetLeaseSummaryInput,
  GetLeaseSummaryOutput,
  SearchWorkOrdersInput,
  SearchWorkOrdersOutput,
  GetWorkOrderInput,
  GetWorkOrderOutput,
  CreateWorkOrderInput,
  CreateWorkOrderOutput,
  UpdateWorkOrderInput,
  UpdateWorkOrderOutput,
  AddWorkOrderNoteInput,
  AddWorkOrderNoteOutput,
  VendorDirectoryLookupInput,
  VendorDirectoryLookupOutput,
  VendorUpsertInput,
  VendorUpsertOutput,
  DraftMessageInput,
  DraftMessageOutput,
  LogCommunicationInput,
  LogCommunicationOutput,
  GetMessageThreadInput,
  GetMessageThreadOutput,
  SearchLaborRatesInput,
  SearchLaborRatesOutput,
  GetMaterialPriceInput,
  GetMaterialPriceOutput,
  PricebookUpsertInput,
  PricebookUpsertOutput,
  ImportTransactionsInput,
  ImportTransactionsOutput,
  FetchTransactionsInput,
  FetchTransactionsOutput,
  CategorizeTransactionInput,
  CategorizeTransactionOutput,
  GeneratePnLInput,
  GeneratePnLOutput,
  FlagAnomalyInput,
  FlagAnomalyOutput,
} from "../shared/tool-schemas";

export type ToolNameT = z.infer<typeof ToolName>;

// export type ToolContext = {
//   trace_id: string;
//   agent: AgentName;
//   user_id?: string;
//   db?: unknown;
//   logger?: {
//     info: (...args: any[]) => void;
//     warn: (...args: any[]) => void;
//     error: (...args: any[]) => void;
//   };
// };

type AnyZod = z.ZodTypeAny;

export type ToolDef<I extends AnyZod, O extends AnyZod> = {
  name: ToolNameT;
  inputSchema: I;
  outputSchema: O;
  allowedAgents: readonly AgentName[];
  sideEffects: boolean;
  handler: (args: z.infer<I>, ctx: ToolContext) => Promise<z.infer<O>> | z.infer<O>;
};

const allAgents = AGENT_NAMES;

function notImplemented(outputSchema: AnyZod, ctx: ToolContext) {
  const result = {
    ok: false,
    error: {
      code: "NOT_IMPLEMENTED",
      message: "Tool handler not implemented yet.",
      retryable: false,
    },
    meta: {
      trace_id: ctx.trace.trace_id,
      sources: [],
      latency_ms: 0,
    },
  };
  return outputSchema.parse(result);
}

function ok<T>(ctx: ToolContext, data: T, sources: any[] = []) {
  return {
    ok: true,
    data,
    meta: {
      trace_id: ctx.trace.trace_id,
      sources,
      latency_ms: 0,
    },
  };
}

function err(ctx: ToolContext, code: string, message: string, retryable = false) {
  return {
    ok: false,
    error: { code, message, retryable },
    meta: {
      trace_id: ctx.trace.trace_id,
      sources: [],
      latency_ms: 0,
    },
  };
}

const priorityMap: Record<string, any> = {
  urgent: "EMERGENCY",
  high: "HIGH",
  normal: "MEDIUM",
  low: "LOW",
};

const channelMap: Record<string, any> = {
  ui: "UI",
  sms: "SMS",
  email: "EMAIL",
  internal: "INTERNAL",
};

const directionMap: Record<string, any> = {
  inbound: "INBOUND",
  outbound: "OUTBOUND",
};

export const toolRegistry: Record<ToolNameT, ToolDef<AnyZod, AnyZod>> = {
  get_property_context: {
    name: "get_property_context",
    inputSchema: GetPropertyContextInput,
    outputSchema: GetPropertyContextOutput,
    allowedAgents: allAgents,
    sideEffects: false,
    handler: async (args, ctx) => {
      const prisma = ctx.db as PrismaClient;
      const property = await prisma.property.findUnique({ where: { id: args.property_id } });
      if (!property) {
        return err(ctx, "NOT_FOUND", "Property not found");
      }

      const unitsCount = await prisma.unit.count({ where: { propertyId: property.id } });
      const address = {
        line1: property.address ?? property.name ?? "Unknown",
        city: property.city ?? "Unknown",
        state: (property.state ?? "NA").slice(0, 2).toUpperCase(),
        zip: property.zipCode?.padStart(5, "0").slice(0, 10) ?? "00000",
      };

      const data = {
        property_id: property.id,
        address,
        property_type: ["single_family", "multi_family", "commercial"].includes(property.propertyType ?? "")
          ? (property.propertyType as any)
          : "other",
        year_built: property.yearBuilt ?? undefined,
        units_count: unitsCount || undefined,
        timezone: ctx.config.timezone,
        notes: [],
        tags: property.tags ?? [],
        utility_shutoffs: undefined,
      };

      return ok(ctx, data);
    },
  },
  get_unit_context: {
    name: "get_unit_context",
    inputSchema: GetUnitContextInput,
    outputSchema: GetUnitContextOutput,
    allowedAgents: allAgents,
    sideEffects: false,
    handler: async (args, ctx) => {
      const prisma = ctx.db as PrismaClient;
      const unit = await prisma.unit.findUnique({
        where: { id: args.unit_id },
        include: { lease: true },
      });
      if (!unit) {
        return err(ctx, "NOT_FOUND", "Unit not found");
      }

      const data = {
        unit_id: unit.id,
        property_id: unit.propertyId,
        unit_label: unit.name ?? unit.unitNumber ?? "unit",
        beds: unit.bedrooms ?? undefined,
        baths: unit.bathrooms ?? undefined,
        sqft: unit.squareFeet ?? undefined,
        occupancy_status: unit.lease ? "occupied" : "vacant",
        availability_date: undefined,
        rent_target_cents: undefined,
        amenities: [],
        photos: [],
        notes: [],
      };
      return ok(ctx, data);
    },
  },
  get_tenant_context: {
    name: "get_tenant_context",
    inputSchema: GetTenantContextInput,
    outputSchema: GetTenantContextOutput,
    allowedAgents: allAgents,
    sideEffects: false,
    handler: async (args, ctx) => {
      const prisma = ctx.db as PrismaClient;
      const tenant = await prisma.user.findUnique({
        where: { id: args.tenant_id },
        include: {
          lease: {
            include: {
              unit: true,
            },
          },
        },
      });

      if (!tenant) {
        return err(ctx, "NOT_FOUND", "Tenant not found");
      }

      const fullName = `${tenant.firstName ?? ""} ${tenant.lastName ?? ""}`.trim() || tenant.username;

      const data = {
        tenant_id: tenant.id,
        full_name: fullName,
        phone: tenant.phoneNumber ?? undefined,
        email: tenant.email ?? undefined,
        preferred_channel: "sms" as const,
        language: "en",
        property_id: tenant.lease?.unit?.propertyId ?? undefined,
        unit_id: tenant.lease?.unitId ?? undefined,
        lease_id: tenant.lease?.id ?? undefined,
        move_in_date: tenant.lease?.startDate?.toISOString().slice(0, 10) ?? undefined,
        move_out_date: tenant.lease?.endDate?.toISOString().slice(0, 10) ?? undefined,
        balance_due_cents: undefined,
        flags: [],
      };

      return ok(ctx, data);
    },
  },
  get_lease_summary: {
    name: "get_lease_summary",
    inputSchema: GetLeaseSummaryInput,
    outputSchema: GetLeaseSummaryOutput,
    allowedAgents: ["TenantCommsAgent", "LeaseUpAgent", "PropertyOpsOrchestrator"],
    sideEffects: false,
    handler: async (_args, ctx) => notImplemented(GetLeaseSummaryOutput, ctx),
  },
  search_work_orders: {
    name: "search_work_orders",
    inputSchema: SearchWorkOrdersInput,
    outputSchema: SearchWorkOrdersOutput,
    allowedAgents: allAgents,
    sideEffects: false,
    handler: async (_args, ctx) => notImplemented(SearchWorkOrdersOutput, ctx),
  },
  get_work_order: {
    name: "get_work_order",
    inputSchema: GetWorkOrderInput,
    outputSchema: GetWorkOrderOutput,
    allowedAgents: allAgents,
    sideEffects: false,
    handler: async (_args, ctx) => notImplemented(GetWorkOrderOutput, ctx),
  },
  create_work_order: {
    name: "create_work_order",
    inputSchema: CreateWorkOrderInput,
    outputSchema: CreateWorkOrderOutput,
    allowedAgents: ["MaintenanceTriageAgent"],
    sideEffects: true,
    handler: async (args, ctx) => {
      const prisma = ctx.db as PrismaClient;
      const authorId = ctx.user?.user_id ?? args.tenant_id;
      if (!authorId) {
        return err(ctx, "FORBIDDEN", "Missing author for work order creation");
      }

      const lease = args.tenant_id
        ? await prisma.lease.findFirst({ where: { tenantId: args.tenant_id }, select: { id: true } })
        : null;

      const request = await prisma.maintenanceRequest.create({
        data: {
          title: args.title,
          description: args.description ?? "",
          authorId,
          propertyId: args.property_id,
          unitId: args.unit_id ?? null,
          leaseId: lease?.id ?? null,
          priority: priorityMap[args.priority] ?? "MEDIUM",
          status: "PENDING",
        } as any,
      });

      const response = {
        work_order_id: request.id,
        property_id: request.propertyId ?? args.property_id,
        unit_id: request.unitId ?? args.unit_id ?? undefined,
        tenant_id: args.tenant_id ?? undefined,
        title: request.title,
        category: args.category ?? "other",
        priority: args.priority ?? "normal",
        status: "new" as const,
        description: request.description ?? undefined,
        scope_notes: args.scope_notes ?? [],
        attachments: args.attachments ?? [],
        assigned_vendor_id: undefined,
        scheduled_window: undefined,
        created_at: request.createdAt.toISOString(),
        updated_at: request.updatedAt.toISOString(),
        tags: args.tags ?? [],
      };

      return ok(ctx, response);
    },
  },
  update_work_order: {
    name: "update_work_order",
    inputSchema: UpdateWorkOrderInput,
    outputSchema: UpdateWorkOrderOutput,
    allowedAgents: ["MaintenanceTriageAgent"],
    sideEffects: true,
    handler: async (_args, ctx) => notImplemented(UpdateWorkOrderOutput, ctx),
  },
  add_work_order_note: {
    name: "add_work_order_note",
    inputSchema: AddWorkOrderNoteInput,
    outputSchema: AddWorkOrderNoteOutput,
    allowedAgents: ["MaintenanceTriageAgent"],
    sideEffects: true,
    handler: async (args, ctx) => {
      const prisma = ctx.db as PrismaClient;
      const authorId = ctx.user?.user_id;
      const request = await prisma.maintenanceRequest.findUnique({ where: { id: args.work_order_id } });
      if (!request) return err(ctx, "NOT_FOUND", "Work order not found");
      const finalAuthor = authorId ?? request.authorId;
      if (!finalAuthor) return err(ctx, "FORBIDDEN", "Author not provided");

      const note = await prisma.maintenanceNote.create({
        data: {
          requestId: request.id,
          authorId: finalAuthor,
          body: args.note,
        },
      });

      const noteId = randomUUID();
      const data = {
        note_id: noteId,
        work_order_id: request.id,
        created_at: note.createdAt.toISOString(),
        author: args.author ?? "system",
        visibility: args.visibility ?? "internal",
        note: args.note,
      };

      return ok(ctx, data);
    },
  },
  vendor_directory_lookup: {
    name: "vendor_directory_lookup",
    inputSchema: VendorDirectoryLookupInput,
    outputSchema: VendorDirectoryLookupOutput,
    allowedAgents: ["MaintenanceTriageAgent", "RepairEstimator"],
    sideEffects: false,
    handler: async (_args, ctx) => notImplemented(VendorDirectoryLookupOutput, ctx),
  },
  vendor_upsert: {
    name: "vendor_upsert",
    inputSchema: VendorUpsertInput,
    outputSchema: VendorUpsertOutput,
    allowedAgents: ["PropertyOpsOrchestrator"],
    sideEffects: true,
    handler: async (_args, ctx) => notImplemented(VendorUpsertOutput, ctx),
  },
  draft_message: {
    name: "draft_message",
    inputSchema: DraftMessageInput,
    outputSchema: DraftMessageOutput,
    allowedAgents: ["TenantCommsAgent", "LeaseUpAgent"],
    sideEffects: false,
    handler: async (args, ctx) => {
      const subject = `${args.intent.replace(/_/g, " ")} update`;
      const bodyLines = [
        args.variables?.tenantName ? `Hi ${args.variables.tenantName},` : "Hello,",
        args.variables?.issueSummary ? `We received your request: ${args.variables.issueSummary}.` : "",
        "We'll follow up with next steps shortly.",
      ].filter(Boolean);

      const data = {
        subject,
        body: bodyLines.join("\n\n"),
        sms: bodyLines.join(" "),
        key_points: args.variables?.nextSteps ?? [],
        requested_info: args.variables?.requested_info ?? [],
        deadlines: [],
      };

      return ok(ctx, data);
    },
  },
  log_communication: {
    name: "log_communication",
    inputSchema: LogCommunicationInput,
    outputSchema: LogCommunicationOutput,
    allowedAgents: ["TenantCommsAgent", "LeaseUpAgent", "MaintenanceTriageAgent"],
    sideEffects: true,
    handler: async (args, ctx) => {
      const prisma = ctx.db as PrismaClient;
      const channel = channelMap[args.channel];
      const direction = directionMap[args.direction];
      if (!channel || !direction) return err(ctx, "INVALID_INPUT", "Unsupported channel or direction");

      const record = await prisma.communicationLog.create({
        data: {
          channel,
          direction,
          to: args.to,
          from: args.from,
          subject: args.subject ?? null,
          message: args.message,
          tenantId: args.tenant_id ?? null,
          propertyId: args.property_id ?? null,
          unitId: args.unit_id ?? null,
          requestId: args.work_order_id ?? null,
          createdById: ctx.user?.user_id ?? null,
        } as any,
      });

      const data = {
        communication_id: randomUUID(),
        timestamp: record.createdAt.toISOString(),
        channel: args.channel,
        direction: args.direction,
        to: record.to,
        from: record.from,
        subject: record.subject ?? undefined,
        message: record.message,
        tenant_id: args.tenant_id ?? undefined,
        property_id: args.property_id ?? undefined,
        unit_id: args.unit_id ?? undefined,
        work_order_id: args.work_order_id ?? undefined,
        tags: args.tags ?? [],
      };

      return ok(ctx, data);
    },
  },
  get_message_thread: {
    name: "get_message_thread",
    inputSchema: GetMessageThreadInput,
    outputSchema: GetMessageThreadOutput,
    allowedAgents: ["TenantCommsAgent"],
    sideEffects: false,
    handler: async (_args, ctx) => notImplemented(GetMessageThreadOutput, ctx),
  },
  search_labor_rates: {
    name: "search_labor_rates",
    inputSchema: SearchLaborRatesInput,
    outputSchema: SearchLaborRatesOutput,
    allowedAgents: ["RepairEstimator"],
    sideEffects: false,
    handler: async (args, ctx) => {
      const prisma = ctx.db as PrismaClient;
      const rate = await prisma.pricebookLaborRate.findFirst({
        where: {
          trade: args.trade,
          zipCode: args.zip,
        },
      });

      const data = {
        trade: args.trade,
        task: args.task,
        zip: args.zip,
        hourly_low_cents: rate?.hourlyLowCents ?? 12500,
        hourly_high_cents: rate?.hourlyHighCents ?? 19500,
        basis: rate ? ("pricebook" as const) : ("manual" as const),
        source_note: rate?.sourceNote ?? "internal pricebook",
        updated_at: rate?.updatedAt?.toISOString() ?? undefined,
      };

      return ok(ctx, data);
    },
  },
  get_material_price: {
    name: "get_material_price",
    inputSchema: GetMaterialPriceInput,
    outputSchema: GetMaterialPriceOutput,
    allowedAgents: ["RepairEstimator"],
    sideEffects: false,
    handler: async (args, ctx) => {
      const prisma = ctx.db as PrismaClient;
      const material = await prisma.pricebookMaterialPrice.findFirst({
        where: {
          item: args.item,
          ...(args.zip ? { zipCode: args.zip } : {}),
        },
      });

      const unitPrice = material?.unitPriceCents ?? 5000;
      const total = unitPrice * args.qty;

      const data = {
        item: args.item,
        qty: args.qty,
        unit: args.unit ?? material?.unit ?? "each",
        unit_price_cents: unitPrice,
        total_cents: total,
        availability: "unknown" as const,
        basis: material ? ("pricebook" as const) : ("manual" as const),
        source_note: material?.sourceNote ?? "internal pricebook",
        updated_at: material?.updatedAt?.toISOString() ?? undefined,
      };

      return ok(ctx, data);
    },
  },
  pricebook_upsert: {
    name: "pricebook_upsert",
    inputSchema: PricebookUpsertInput,
    outputSchema: PricebookUpsertOutput,
    allowedAgents: ["PropertyOpsOrchestrator"],
    sideEffects: true,
    handler: async (_args, ctx) => notImplemented(PricebookUpsertOutput, ctx),
  },
  import_transactions: {
    name: "import_transactions",
    inputSchema: ImportTransactionsInput,
    outputSchema: ImportTransactionsOutput,
    allowedAgents: ["BookkeepingAgent"],
    sideEffects: true,
    handler: async (_args, ctx) => notImplemented(ImportTransactionsOutput, ctx),
  },
  fetch_transactions: {
    name: "fetch_transactions",
    inputSchema: FetchTransactionsInput,
    outputSchema: FetchTransactionsOutput,
    allowedAgents: ["BookkeepingAgent"],
    sideEffects: false,
    handler: async (_args, ctx) => notImplemented(FetchTransactionsOutput, ctx),
  },
  categorize_transaction: {
    name: "categorize_transaction",
    inputSchema: CategorizeTransactionInput,
    outputSchema: CategorizeTransactionOutput,
    allowedAgents: ["BookkeepingAgent"],
    sideEffects: true,
    handler: async (_args, ctx) => notImplemented(CategorizeTransactionOutput, ctx),
  },
  generate_pnl: {
    name: "generate_pnl",
    inputSchema: GeneratePnLInput,
    outputSchema: GeneratePnLOutput,
    allowedAgents: ["BookkeepingAgent"],
    sideEffects: false,
    handler: async (_args, ctx) => notImplemented(GeneratePnLOutput, ctx),
  },
  flag_anomaly: {
    name: "flag_anomaly",
    inputSchema: FlagAnomalyInput,
    outputSchema: FlagAnomalyOutput,
    allowedAgents: ["BookkeepingAgent"],
    sideEffects: true,
    handler: async (_args, ctx) => notImplemented(FlagAnomalyOutput, ctx),
  },
};

export async function invokeTool<TName extends ToolNameT>(
  name: TName,
  args: unknown,
  ctx: ToolContext
): Promise<z.infer<(typeof toolRegistry)[TName]["outputSchema"]>> {
  const def = toolRegistry[name];

  if (!def.allowedAgents.includes(ctx.agent)) {
    const denied = {
      ok: false,
      error: {
        code: "FORBIDDEN",
        message: `Agent '${ctx.agent}' is not allowed to call tool '${name}'.`,
        retryable: false,
      },
      meta: { trace_id: ctx.trace.trace_id, sources: [], latency_ms: 0 },
    };
    return def.outputSchema.parse(denied);
  }

  const parsedArgs = def.inputSchema.parse(args);
  const result = await def.handler(parsedArgs, ctx);
  return def.outputSchema.parse(result) as any;
}
