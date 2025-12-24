// shared/approval-schemas.ts
import { z } from "zod";

export const ApprovalTaskStatus = z.enum([
  "PENDING",
  "APPROVED",
  "REJECTED",
  "EXECUTED",
  "FAILED",
  "CANCELLED",
]);

export const ApprovalActionType = z.enum([
  "SEND_MESSAGE",
  "ASSIGN_TECHNICIAN",
  "CREATE_SCHEDULE_EVENT",
  "UPDATE_WORK_ORDER",
]);

export const SendMessageAction = z.object({
  type: z.literal("SEND_MESSAGE"),
  args: z.object({
    channel: z.enum(["sms", "email", "ui", "internal"]),
    to: z.string(),
    from: z.string().default("system"),
    subject: z.string().optional(),
    body: z.string().min(1),
    metadata: z.record(z.any()).optional(),
  }),
});

export const AssignTechnicianAction = z.object({
  type: z.literal("ASSIGN_TECHNICIAN"),
  args: z.object({
    work_order_id: z.string().uuid(),
    technician_id: z.number().int(), // Technician.id is Int in your current schema (unless you migrate it later)
    note: z.string().optional(),
  }),
});

export const CreateScheduleEventAction = z.object({
  type: z.literal("CREATE_SCHEDULE_EVENT"),
  args: z.object({
    type: z.enum(["MAINTENANCE", "INSPECTION", "MOVE_IN", "MOVE_OUT", "TOUR", "LEASE_RENEWAL", "LEASE_EXPIRATION"]),
    title: z.string().min(1),
    date: z.string().datetime(),
    priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
    description: z.string().optional(),
    property_id: z.string().uuid().optional(),
    unit_id: z.string().uuid().optional(),
    tenant_id: z.string().uuid().optional(),
  }),
});

export const UpdateWorkOrderAction = z.object({
  type: z.literal("UPDATE_WORK_ORDER"),
  args: z.object({
    work_order_id: z.string().uuid(),
    patch: z.record(z.any()), // keep flexible: status, dueAt, etc.
  }),
});

export const ApprovalAction = z.discriminatedUnion("type", [
  SendMessageAction,
  AssignTechnicianAction,
  CreateScheduleEventAction,
  UpdateWorkOrderAction,
]);

export const ApprovalTaskActions = z.array(ApprovalAction).min(1);

export const ApprovalTaskCreatePayload = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  agent_run_id: z.string().uuid().optional(),
  tenant_id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional(),
  unit_id: z.string().uuid().optional(),
  lease_id: z.string().uuid().optional(),
  work_order_id: z.string().uuid().optional(),
  actions: ApprovalTaskActions,
});

export const ApprovalDecisionPayload = z.object({
  decision: z.enum(["APPROVE", "REJECT"]),
  // Optional edits before execution (typically message body edits)
  edits: z
    .object({
      // replace the SEND_MESSAGE body/subject if you want
      message_body: z.string().optional(),
      message_subject: z.string().optional(),
    })
    .optional(),
});
    