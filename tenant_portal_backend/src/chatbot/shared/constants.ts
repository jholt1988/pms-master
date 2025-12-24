// shared/constants.ts

export const DEFAULT_TIMEZONE = "America/Chicago" as const;

export const CURRENCY_CODES = ["USD"] as const;
export type CurrencyCode = (typeof CURRENCY_CODES)[number];

export const CHANNELS = ["ui", "sms", "email", "internal"] as const;
export type Channel = (typeof CHANNELS)[number];

export const DIRECTIONS = ["inbound", "outbound"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const PRIORITIES = ["low", "normal", "high", "urgent"] as const;
export type Priority = (typeof PRIORITIES)[number];

export const SEVERITIES = ["low", "medium", "high", "emergency"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const TRADES = [
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
] as const;
export type Trade = (typeof TRADES)[number];

export const WORK_ORDER_CATEGORIES = [
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
] as const;
export type WorkOrderCategory = (typeof WORK_ORDER_CATEGORIES)[number];

export const WORK_ORDER_STATUSES = [
  "new",
  "triaged",
  "scheduled",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
] as const;
export type WorkOrderStatus = (typeof WORK_ORDER_STATUSES)[number];

export const ROUTES = [
  "RepairEstimator",
  "MaintenanceTriage",
  "TenantComms",
  "LeaseUp",
  "Bookkeeping",
  "HumanEscalation",
] as const;
export type RouteTo = (typeof ROUTES)[number];

// Your internal agent names (not necessarily identical to ROUTES)
export const AGENT_NAMES = [
  "PropertyOpsOrchestrator",
  "MaintenanceTriageAgent",
  "RepairEstimator",
  "TenantCommsAgent",
  "LeaseUpAgent",
  "BookkeepingAgent",
] as const;
export type AgentName = (typeof AGENT_NAMES)[number];

// Useful “UX defaults”
export const DEFAULTS = {
  timezone: DEFAULT_TIMEZONE,
  currency: "USD" as CurrencyCode,
  comms: {
    tone: "neutral" as const,
    channel: "sms" as Channel,
  },
  pagination: {
    limit: 50,
  },
} as const;

