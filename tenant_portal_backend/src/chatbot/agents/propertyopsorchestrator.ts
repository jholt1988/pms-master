// agents/propertyOpsOrchestrator.ts
import { z } from "zod";
import type { PrismaClient } from "@prisma/client";
import type { AgentName } from "../shared/constants";
import { invokeTool } from "../tools"; // your invokeTool(name,args,ctx)
import type { ToolContext } from "../tools/tool-context";

// ---------- Input / Output types ----------
const OrchestratorInputSchema = z.object({
  tenant_id: z.string().uuid(),
  property_id: z.string().uuid(),
  unit_id: z.string().uuid(),
  issue_text: z.string().min(1),
  attachments: z
    .array(
      z.object({
        file_id: z.string(),
        filename: z.string(),
        mime_type: z.string().optional(),
        size_bytes: z.number().int().nonnegative().optional(),
        url: z.string().url().optional(),
        tags: z.array(z.string()).optional(),
      })
    )
    .default([]),
  reported_at: z.string().datetime().optional(),
});

export type OrchestratorInput = z.infer<typeof OrchestratorInputSchema>;

export type OrchestratorTerminal =
  | {
      status: "READY_FOR_APPROVAL";
      work_order_id: string;
      estimate: {
        labor_low_cents: number;
        labor_high_cents: number;
        material_total_cents: number;
        project_low_cents: number;
        project_high_cents: number;
        assumptions: string[];
        confidence: number; // 0..1
      };
      tenant_message_draft: {
        channel: "sms" | "email" | "ui" | "internal";
        subject?: string;
        body: string;
      };
      requires_approval: true;
      next_actions: string[];
      trace_id: string;
      agent_run_id: string;
    }
  | {
      status: "NEED_MORE_INFO";
      questions: string[];
      trace_id: string;
      agent_run_id: string;
    }
  | {
      status: "ESCALATE_HUMAN";
      reason: string;
      recommended_actions: string[];
      tenant_message_draft?: { channel: "sms" | "email" | "ui" | "internal"; body: string; subject?: string };
      trace_id: string;
      agent_run_id: string;
    };

// ---------- State machine ----------
enum State {
  S0_VALIDATE_INTAKE = "S0_VALIDATE_INTAKE",
  S1_LOAD_CONTEXT = "S1_LOAD_CONTEXT",
  S2_TRIAGE_AND_CLASSIFY = "S2_TRIAGE_AND_CLASSIFY",
  S3_CREATE_WORK_ORDER = "S3_CREATE_WORK_ORDER",
  S4_ESTIMATE_COST_RANGE = "S4_ESTIMATE_COST_RANGE",
  S5_DRAFT_TENANT_UPDATE = "S5_DRAFT_TENANT_UPDATE",
  S6_LOG_AND_SUMMARIZE = "S6_LOG_AND_SUMMARIZE",
  S7_READY_FOR_APPROVAL = "S7_READY_FOR_APPROVAL",
}

type Memory = {
  intake: OrchestratorInput;

  // loaded context
  tenant_ctx?: any;
  property_ctx?: any;
  unit_ctx?: any;

  // triage
  category?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  vendor_trade?: string;
  scope_notes?: string[];
  clarifying_questions?: string[];

  // work order
  work_order_id?: string;
  work_order_record?: any;

  // estimate
  estimate?: OrchestratorTerminal extends infer T
    ? any
    : never;

  estimate_obj?: {
    labor_low_cents: number;
    labor_high_cents: number;
    material_total_cents: number;
    project_low_cents: number;
    project_high_cents: number;
    assumptions: string[];
    confidence: number;
  };

  // comms
  tenant_message_draft?: { channel: "sms" | "email" | "ui" | "internal"; subject?: string; body: string };

  // internal summary
  internal_summary?: string;

  // bookkeeping
  state_history: { state: State; at: string; note?: string }[];
};

// ---------- Helpers ----------
function nowISO(ctx: ToolContext) {
  return ctx.clock.nowISO();
}

function ctxAs(ctx: ToolContext, agent: AgentName, spanSuffix: string): ToolContext {
  return {
    ...ctx,
    agent,
    trace: {
      trace_id: ctx.trace.trace_id,
      span_id: `${ctx.trace.span_id ?? "root"}:${spanSuffix}`,
      parent_span_id: ctx.trace.span_id,
    },
  };
}

function shortTitle(issue: string) {
  const cleaned = issue.replace(/\s+/g, " ").trim();
  return cleaned.length <= 64 ? cleaned : cleaned.slice(0, 61) + "...";
}

function detectEmergency(issueText: string) {
  const t = issueText.toLowerCase();
  const hits = [
    "gas smell",
    "smell gas",
    "smoke",
    "fire",
    "sparking",
    "sparks",
    "electrical burning",
    "flooding",
    "burst pipe",
    "carbon monoxide",
    "co alarm",
  ].filter((k) => t.includes(k));
  return { isEmergency: hits.length > 0, hits };
}

function classify(issueText: string): {
  category: string;
  trade: string;
  priority: "low" | "normal" | "high" | "urgent";
  scope_notes: string[];
  clarifying_questions: string[];
} {
  const t = issueText.toLowerCase();

  // basic category/trade heuristics (replace with smarter classifier later)
  let category = "general";
  let trade = "general";
  if (/(toilet|sink|faucet|leak|drain|sewer|clog|water heater|pipe)/.test(t)) {
    category = "plumbing"; trade = "plumbing";
  } else if (/(outlet|breaker|flicker|wiring|switch|electrical|power)/.test(t)) {
    category = "electrical"; trade = "electrical";
  } else if (/(ac|a\/c|heat|heater|furnace|hvac|thermostat)/.test(t)) {
    category = "hvac"; trade = "hvac";
  } else if (/(roach|bed bug|mice|rats|pest)/.test(t)) {
    category = "pest"; trade = "pest";
  } else if (/(lock|key|deadbolt|door won.?t|locked out)/.test(t)) {
    category = "locksmith"; trade = "locksmith";
  } else if (/(roof|leak in ceiling|shingle)/.test(t)) {
    category = "roofing"; trade = "roofing";
  } else if (/(appliance|fridge|refrigerator|stove|oven|dishwasher|washer|dryer)/.test(t)) {
    category = "appliance"; trade = "appliance";
  }

  // priority heuristics
  let priority: "low" | "normal" | "high" | "urgent" = "normal";
  if (/(no heat|no ac|not working|stopped working|major leak|overflow)/.test(t)) priority = "high";
  if (/(flooding|burst|sparking|smoke|fire|gas smell)/.test(t)) priority = "urgent";

  const scope_notes: string[] = [
    `Reported issue: ${issueText.trim()}`,
    `Detected category: ${category}, trade: ${trade}, priority: ${priority}`,
  ];

  // clarifying questions (only if vague)
  const clarifying_questions: string[] = [];
  if (t.length < 20) clarifying_questions.push("Can you describe what happened and when it started?");
  if (/(leak|water)/.test(t) && !/(where|kitchen|bath|toilet|sink|ceiling|wall|floor)/.test(t)) {
    clarifying_questions.push("Where exactly is the leak (kitchen/bathroom/ceiling/wall/floor)?");
  }
  if (/(electrical|outlet|breaker)/.test(t) && !/(which room|room|kitchen|bath|bed)/.test(t)) {
    clarifying_questions.push("Which room/area is affected?");
  }

  return { category, trade, priority, scope_notes, clarifying_questions };
}

// ---------- Prisma logging wrappers ----------
async function createAgentRun(prisma: PrismaClient, ctx: ToolContext, input: OrchestratorInput) {
  // Requires Prisma models AgentRun/AgentToolCall
  const run = await prisma.agentRun.create({
    data: {
      agentName: "PropertyOpsOrchestrator",
      status: "RUNNING",
      input: input as any,
      traceId: ctx.trace.trace_id,
      propertyId: input.property_id,
      unitId: input.unit_id,
      tenantId: input.tenant_id,
      startedAt: ctx.clock.now(),
    } as any,
  });
  return run as any as { id: string };
}

async function updateAgentRun(prisma: PrismaClient, runId: string, patch: Partial<{ status: string; output: any; error: string; completedAt: Date }>) {
  await prisma.agentRun.update({
    where: { id: runId },
    data: patch as any,
  });
}

async function logToolCall(prisma: PrismaClient, runId: string, toolName: string, input: any, output: any, latencyMs: number) {
  const ok = output?.ok === true;
  await prisma.agentToolCall.create({
    data: {
      agentRunId: runId,
      toolName,
      input: input as any,
      output: output as any,
      ok,
      errorCode: ok ? null : output?.error?.code ?? "UNKNOWN",
      errorMessage: ok ? null : output?.error?.message ?? "Unknown tool error",
      latencyMs,
    } as any,
  });
}

async function invokeToolLogged<TName extends Parameters<typeof invokeTool>[0]>(
  prisma: PrismaClient,
  runId: string,
  name: TName,
  args: any,
  ctx: ToolContext
) {
  const started = Date.now();
  const out = await invokeTool(name as any, args, ctx);
  const latency = Date.now() - started;
  await logToolCall(prisma, runId, String(name), args, out, latency);
  return out as any;
}

// ---------- Main runner ----------
export async function runPropertyOpsOrchestrator(inputRaw: unknown, ctx: ToolContext): Promise<OrchestratorTerminal> {
  const intake = OrchestratorInputSchema.parse(inputRaw);
  const prisma = ctx.db;

  const agentRun = await createAgentRun(prisma, ctx, intake);

  const mem: Memory = {
    intake,
    state_history: [{ state: State.S0_VALIDATE_INTAKE, at: nowISO(ctx) }],
  };

  let state: State = State.S0_VALIDATE_INTAKE;

  const persist = async () => {
    await updateAgentRun(prisma, agentRun.id, {
      output: mem as any,
      status: "RUNNING",
    });
  };

  try {
    while (true) {
      // Persist between states so you can debug/resume
      await persist();

      if (state === State.S0_VALIDATE_INTAKE) {
        const { isEmergency, hits } = detectEmergency(mem.intake.issue_text);
        if (isEmergency) {
          const draft = {
            channel: "sms" as const,
            body:
              `We received your report. This may be an emergency (${hits.join(", ")}). ` +
              `If you smell gas or see smoke/fire, leave immediately and call 911/your utility company. ` +
              `Reply with “SAFE” once you’re in a safe place.`,
          };

          await updateAgentRun(prisma, agentRun.id, {
            status: "FAILED",
            output: { ...mem, emergency: hits },
            error: `Emergency detected: ${hits.join(", ")}`,
            completedAt: ctx.clock.now(),
          });

          return {
            status: "ESCALATE_HUMAN",
            reason: `Emergency indicators detected: ${hits.join(", ")}`,
            recommended_actions: [
              "Human review immediately",
              "Attempt phone contact",
              "Dispatch emergency vendor if needed",
            ],
            tenant_message_draft: draft,
            trace_id: ctx.trace.trace_id,
            agent_run_id: agentRun.id,
          };
        }

        // basic missing info check
        const questions: string[] = [];
        if (!mem.intake.issue_text || mem.intake.issue_text.trim().length === 0) {
          questions.push("What issue are you experiencing? Please describe what’s happening.");
        }
        if (questions.length > 0) {
          await updateAgentRun(prisma, agentRun.id, {
            status: "COMPLETED",
            output: { ...mem, questions },
            completedAt: ctx.clock.now(),
          });
          return {
            status: "NEED_MORE_INFO",
            questions,
            trace_id: ctx.trace.trace_id,
            agent_run_id: agentRun.id,
          };
        }

        mem.state_history.push({ state: State.S1_LOAD_CONTEXT, at: nowISO(ctx) });
        state = State.S1_LOAD_CONTEXT;
        continue;
      }

      if (state === State.S1_LOAD_CONTEXT) {
        // Delegate read tools under orchestrator identity (allowed for all)
        const c = ctxAs(ctx, "PropertyOpsOrchestrator", "load_context");

        const tenantRes = await invokeToolLogged(prisma, agentRun.id, "get_tenant_context", { tenant_id: mem.intake.tenant_id }, c);
        if (!tenantRes.ok) throw new Error(`get_tenant_context failed: ${tenantRes.error.message}`);
        mem.tenant_ctx = tenantRes.data;

        const propRes = await invokeToolLogged(prisma, agentRun.id, "get_property_context", { property_id: mem.intake.property_id }, c);
        if (!propRes.ok) throw new Error(`get_property_context failed: ${propRes.error.message}`);
        mem.property_ctx = propRes.data;

        const unitRes = await invokeToolLogged(prisma, agentRun.id, "get_unit_context", { unit_id: mem.intake.unit_id }, c);
        if (!unitRes.ok) throw new Error(`get_unit_context failed: ${unitRes.error.message}`);
        mem.unit_ctx = unitRes.data;

        mem.state_history.push({ state: State.S2_TRIAGE_AND_CLASSIFY, at: nowISO(ctx) });
        state = State.S2_TRIAGE_AND_CLASSIFY;
        continue;
      }

      if (state === State.S2_TRIAGE_AND_CLASSIFY) {
        const triage = classify(mem.intake.issue_text);

        mem.category = triage.category;
        mem.vendor_trade = triage.trade;
        mem.priority = triage.priority;
        mem.scope_notes = triage.scope_notes;
        mem.clarifying_questions = triage.clarifying_questions;

        // If not urgent and we need clarity, stop here
        if (mem.clarifying_questions.length > 0 && mem.priority !== "urgent") {
          await updateAgentRun(prisma, agentRun.id, {
            status: "COMPLETED",
            output: mem as any,
            completedAt: ctx.clock.now(),
          });

          return {
            status: "NEED_MORE_INFO",
            questions: mem.clarifying_questions,
            trace_id: ctx.trace.trace_id,
            agent_run_id: agentRun.id,
          };
        }

        mem.state_history.push({ state: State.S3_CREATE_WORK_ORDER, at: nowISO(ctx) });
        state = State.S3_CREATE_WORK_ORDER;
        continue;
      }

      if (state === State.S3_CREATE_WORK_ORDER) {
        // Tool allowlist: create_work_order is allowed for MaintenanceTriageAgent in our registry template
        const c = ctxAs(ctx, "MaintenanceTriageAgent", "create_work_order");

        const woRes = await invokeToolLogged(
          prisma,
          agentRun.id,
          "create_work_order",
          {
            idempotency_key: `${mem.intake.tenant_id}:${mem.intake.unit_id}:${mem.intake.issue_text.slice(0, 80)}`,
            property_id: mem.intake.property_id,
            unit_id: mem.intake.unit_id,
            tenant_id: mem.intake.tenant_id,
            title: shortTitle(mem.intake.issue_text),
            category: mem.category ?? "other",
            priority: mem.priority ?? "normal",
            description: mem.intake.issue_text,
            scope_notes: mem.scope_notes ?? [],
            attachments: mem.intake.attachments ?? [],
            tags: ["orchestrated", "golden_path"],
          },
          c
        );

        if (!woRes.ok) throw new Error(`create_work_order failed: ${woRes.error.message}`);

        mem.work_order_record = woRes.data;
        mem.work_order_id = woRes.data.work_order_id;

        mem.state_history.push({ state: State.S4_ESTIMATE_COST_RANGE, at: nowISO(ctx) });
        state = State.S4_ESTIMATE_COST_RANGE;
        continue;
      }

      if (state === State.S4_ESTIMATE_COST_RANGE) {
        // Tool allowlist: price lookup tools are allowed for RepairEstimator in our registry template
        const c = ctxAs(ctx, "RepairEstimator", "estimate");

        const assumptions: string[] = [];
        const zip = mem.property_ctx?.address?.zip ?? mem.property_ctx?.zipCode ?? "00000"; // adapt to your PropertyContext mapping
        const trade = (mem.vendor_trade ?? "general") as any;

        // Labor rate lookup (fallback if not found)
        let hourlyLow = 12500; // $125/hr fallback
        let hourlyHigh = 19500; // $195/hr fallback

        const laborRes = await invokeToolLogged(prisma, agentRun.id, "search_labor_rates", { trade, zip, task: mem.category ?? "general repair" }, c);
        if (laborRes.ok) {
          hourlyLow = laborRes.data.hourly_low_cents;
          hourlyHigh = laborRes.data.hourly_high_cents;
          assumptions.push(`Labor rates from pricebook: ${trade} @ ${zip}`);
        } else {
          assumptions.push(`Labor rate not found in pricebook for ${trade}/${zip}; used fallback range.`);
        }

        // Hours heuristic (conservative)
        const hoursLow = mem.priority === "urgent" ? 2 : 1;
        const hoursHigh = mem.priority === "urgent" ? 6 : 4;
        const laborLow = hourlyLow * hoursLow;
        const laborHigh = hourlyHigh * hoursHigh;

        // Materials (small set; you can make this smarter later)
        const materialItems: Array<{ item: string; qty: number; unit?: string }> = [];
        if (trade === "plumbing") materialItems.push({ item: "plumbing parts allowance", qty: 1, unit: "each" });
        if (trade === "electrical") materialItems.push({ item: "electrical parts allowance", qty: 1, unit: "each" });
        if (trade === "hvac") materialItems.push({ item: "hvac parts allowance", qty: 1, unit: "each" });
        if (materialItems.length === 0) materialItems.push({ item: "misc parts allowance", qty: 1, unit: "each" });

        let materialTotal = 0;
        for (const mi of materialItems) {
          const matRes = await invokeToolLogged(prisma, agentRun.id, "get_material_price", { ...mi, zip }, c);
          if (matRes.ok) {
            materialTotal += matRes.data.total_cents;
            assumptions.push(`Material line: ${mi.item} (${matRes.data.total_cents} cents)`);
          } else {
            // fallback allowance
            const fallback = 5000; // $50
            materialTotal += fallback;
            assumptions.push(`Material price not found for "${mi.item}"; used $50 allowance.`);
          }
        }

        const contingency = Math.round((laborHigh + materialTotal) * 0.15);
        const projectLow = laborLow + materialTotal;
        const projectHigh = laborHigh + materialTotal + contingency;

        // Confidence heuristic
        let confidence = 0.55;
        if ((mem.intake.attachments?.length ?? 0) > 0) confidence += 0.15;
        if ((mem.intake.issue_text?.length ?? 0) > 80) confidence += 0.10;
        if (mem.clarifying_questions && mem.clarifying_questions.length === 0) confidence += 0.10;
        confidence = Math.max(0.1, Math.min(0.95, confidence));

        mem.estimate_obj = {
          labor_low_cents: laborLow,
          labor_high_cents: laborHigh,
          material_total_cents: materialTotal,
          project_low_cents: projectLow,
          project_high_cents: projectHigh,
          assumptions,
          confidence,
        };

        mem.state_history.push({ state: State.S5_DRAFT_TENANT_UPDATE, at: nowISO(ctx) });
        state = State.S5_DRAFT_TENANT_UPDATE;
        continue;
      }

      if (state === State.S5_DRAFT_TENANT_UPDATE) {
        // Tool allowlist: draft_message is allowed for TenantCommsAgent/LeaseUpAgent
        const c = ctxAs(ctx, "TenantCommsAgent", "draft_tenant_update");

        const tenantName = mem.tenant_ctx?.full_name ?? mem.tenant_ctx?.fullName ?? "there";
        const channel = (mem.tenant_ctx?.preferred_channel ?? "sms") as any;

        const msgRes = await invokeToolLogged(
          prisma,
          agentRun.id,
          "draft_message",
          {
            channel,
            intent: "maintenance_intake_ack",
            tone: mem.priority === "urgent" ? "firm" : "neutral",
            variables: {
              tenantName,
              issueSummary: shortTitle(mem.intake.issue_text),
              workOrderId: mem.work_order_id,
              priority: mem.priority,
              nextSteps: [
                "We logged your request and will coordinate the next steps.",
                "If we need entry, we’ll send an access notice before arriving.",
              ],
              estimateLow: mem.estimate_obj?.project_low_cents,
              estimateHigh: mem.estimate_obj?.project_high_cents,
              disclaimer: "Estimate is a preliminary range and may change after diagnosis.",
            },
          },
          c
        );

        if (!msgRes.ok) throw new Error(`draft_message failed: ${msgRes.error.message}`);

        mem.tenant_message_draft = {
          channel,
          subject: msgRes.data.subject,
          body: msgRes.data.body,
        };

        mem.state_history.push({ state: State.S6_LOG_AND_SUMMARIZE, at: nowISO(ctx) });
        state = State.S6_LOG_AND_SUMMARIZE;
        continue;
      }

      if (state === State.S6_LOG_AND_SUMMARIZE) {
        const triageCtx = ctxAs(ctx, "MaintenanceTriageAgent", "log_internal");
        const commsCtx = ctxAs(ctx, "TenantCommsAgent", "log_comms");

        // Add internal note to work order with estimate + assumptions
        await invokeToolLogged(
          prisma,
          agentRun.id,
          "add_work_order_note",
          {
            work_order_id: mem.work_order_id,
            visibility: "internal",
            author: "PropertyOpsOrchestrator",
            note: [
              `Preliminary estimate range: ${mem.estimate_obj?.project_low_cents}–${mem.estimate_obj?.project_high_cents} cents`,
              `Confidence: ${mem.estimate_obj?.confidence}`,
              `Assumptions:`,
              ...(mem.estimate_obj?.assumptions ?? []).map((a) => `- ${a}`),
            ].join("\n"),
          },
          triageCtx
        );

        // Log outbound message as "pending approval"
        await invokeToolLogged(
          prisma,
          agentRun.id,
          "log_communication",
          {
            channel: mem.tenant_message_draft?.channel ?? "sms",
            direction: "outbound",
            to: mem.tenant_ctx?.phone ?? mem.tenant_ctx?.phoneNumber ?? "unknown",
            from: "system",
            subject: mem.tenant_message_draft?.subject,
            message: mem.tenant_message_draft?.body ?? "",
            tenant_id: mem.intake.tenant_id,
            property_id: mem.intake.property_id,
            unit_id: mem.intake.unit_id,
            work_order_id: mem.work_order_id,
            tags: ["pending_approval", "maintenance"],
          },
          commsCtx
        );

        mem.internal_summary =
          `WO ${mem.work_order_id} created (${mem.category}/${mem.priority}). ` +
          `Estimate ${mem.estimate_obj?.project_low_cents}–${mem.estimate_obj?.project_high_cents} cents. ` +
          `Tenant draft prepared (${mem.tenant_message_draft?.channel}).`;

        mem.state_history.push({ state: State.S7_READY_FOR_APPROVAL, at: nowISO(ctx) });
        state = State.S7_READY_FOR_APPROVAL;
        continue;
      }

      if (state === State.S7_READY_FOR_APPROVAL) {
        await updateAgentRun(prisma, agentRun.id, {
          status: "COMPLETED",
          output: mem as any,
          completedAt: ctx.clock.now(),
        });

        return {
          status: "READY_FOR_APPROVAL",
          work_order_id: mem.work_order_id!,
          estimate: mem.estimate_obj!,
          tenant_message_draft: mem.tenant_message_draft!,
          requires_approval: true,
          next_actions: [
            "Approve tenant update (send message)",
            "Assign vendor / technician",
            "Schedule visit window",
            "Update work order status to scheduled",
          ],
          trace_id: ctx.trace.trace_id,
          agent_run_id: agentRun.id,
        };
      }

      // Safety net
      throw new Error(`Unknown state: ${state}`);
    }
  } catch (err: any) {
    const message = err?.message ?? String(err);

    await updateAgentRun(prisma, agentRun.id, {
      status: "FAILED",
      output: mem as any,
      error: message,
      completedAt: ctx.clock.now(),
    });

    return {
      status: "ESCALATE_HUMAN",
      reason: message,
      recommended_actions: [
        "Review AgentRun + AgentToolCall logs",
        "Manually create/adjust work order if needed",
        "Contact tenant if context is missing",
      ],
      trace_id: ctx.trace.trace_id,
      agent_run_id: agentRun.id,
    };
  }
}
