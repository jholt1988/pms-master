// ops/approval-runner.ts
import type { PrismaClient } from "@prisma/client";
import { ApprovalTaskActions, ApprovalDecisionPayload } from "../shared/approval-schemas";
import type { ToolContext } from "../tools/tool-context";
import { invokeTool } from "../tools";
import type { AgentName } from "../shared/constants";

function ensureManager(ctx: ToolContext) {
  const role = (ctx.user as any)?.role; // your User.role enum: TENANT | PROPERTY_MANAGER | ADMIN
  if (role !== "PROPERTY_MANAGER" && role !== "ADMIN") {
    throw new Error("Forbidden: only managers/admins can approve and execute actions.");
  }
}

function delegate(ctx: ToolContext, agent: AgentName, span: string): ToolContext {
  return {
    ...ctx,
    agent,
    trace: {
      trace_id: ctx.trace.trace_id,
      span_id: `${ctx.trace.span_id ?? "root"}:${span}`,
      parent_span_id: ctx.trace.span_id,
    },
  };
}

export async function decideAndExecuteApprovalTask(prisma: PrismaClient, taskId: string, rawDecision: unknown, ctx: ToolContext) {
  ensureManager(ctx);

  const decision = ApprovalDecisionPayload.parse(rawDecision);

  const task = await prisma.approvalTask.findUnique({ where: { id: taskId } });
  if (!task) throw new Error("ApprovalTask not found.");
  if (task.status !== "PENDING") throw new Error(`ApprovalTask not pending (status=${task.status}).`);

  // Apply decision first (atomic-ish)
  const decided = await prisma.approvalTask.update({
    where: { id: taskId },
    data: {
      status: decision.decision === "APPROVE" ? "APPROVED" : "REJECTED",
      decidedById: ctx.user?.user_id,
      decidedAt: ctx.clock.now(),
    } as any,
  });

  if (decision.decision === "REJECT") return decided;

  // Parse + optional edits
  let actions = ApprovalTaskActions.parse(task.actions);

  if (decision.edits?.message_body || decision.edits?.message_subject) {
    actions = actions.map((a) => {
      if (a.type !== "SEND_MESSAGE") return a;
      return {
        ...a,
        args: {
          ...a.args,
          body: decision.edits?.message_body ?? a.args.body,
          subject: decision.edits?.message_subject ?? a.args.subject,
        },
      };
    });
  }

  const results: any[] = [];

  try {
    for (const action of actions) {
      // Route each action to the right specialist identity so tool allowlists still apply
      if (action.type === "SEND_MESSAGE") {
        const c = delegate(ctx, "TenantCommsAgent", "approval_send_message");
        const out = await invokeTool("send_message" as any, action.args, c);
        results.push({ action, out });
        if (!out.ok) throw new Error(`send_message failed: ${out.error?.message ?? "unknown"}`);
      }

      if (action.type === "ASSIGN_TECHNICIAN") {
        const c = delegate(ctx, "MaintenanceTriageAgent", "approval_assign_tech");
        const out = await invokeTool("assign_technician" as any, action.args, c);
        results.push({ action, out });
        if (!out.ok) throw new Error(`assign_technician failed: ${out.error?.message ?? "unknown"}`);
      }

      if (action.type === "CREATE_SCHEDULE_EVENT") {
        const c = delegate(ctx, "MaintenanceTriageAgent", "approval_schedule");
        const out = await invokeTool("create_schedule_event" as any, action.args, c);
        results.push({ action, out });
        if (!out.ok) throw new Error(`create_schedule_event failed: ${out.error?.message ?? "unknown"}`);
      }

      if (action.type === "UPDATE_WORK_ORDER") {
        const c = delegate(ctx, "MaintenanceTriageAgent", "approval_update_work_order");
        const out = await invokeTool("update_work_order" as any, action.args, c);
        results.push({ action, out });
        if (!out.ok) throw new Error(`update_work_order failed: ${out.error?.message ?? "unknown"}`);
      }
    }

    return await prisma.approvalTask.update({
      where: { id: taskId },
      data: {
        status: "EXECUTED",
        executedAt: ctx.clock.now(),
        results: results as any,
      } as any,
    });
  } catch (e: any) {
    return await prisma.approvalTask.update({
      where: { id: taskId },
      data: {
        status: "FAILED",
        executedAt: ctx.clock.now(),
        executionError: e?.message ?? String(e),
        results: results as any,
      } as any,
    });
  }
}
