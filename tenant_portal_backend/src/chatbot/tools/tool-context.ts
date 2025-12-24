// tools/tool-context.ts
import type { PrismaClient } from "@prisma/client";
import type { AgentName } from "../shared/constants";

/** -----------------------------
 * Roles / user / auth
 * ----------------------------*/
export type EnvName = "dev" | "test" | "prod";
export type ToolRole = "owner" | "manager" | "operator" | "viewer" | "system";

export type ToolUser = {
  user_id: string;
  display_name?: string;
  email?: string;
  roles: ToolRole[];
};

export type ToolAuth = {
  org_id?: string;
  team_id?: string;
  impersonating_user_id?: string;
};

export type ToolRequest = {
  request_id: string;
  ip?: string;
  user_agent?: string;
  origin?: string;
};

/** -----------------------------
 * Logger / clock
 * ----------------------------*/
export type LogLevel = "debug" | "info" | "warn" | "error";

export type Logger = {
  level?: LogLevel;
  debug: (msg: string, meta?: Record<string, any>) => void;
  info: (msg: string, meta?: Record<string, any>) => void;
  warn: (msg: string, meta?: Record<string, any>) => void;
  error: (msg: string, meta?: Record<string, any>) => void;
};

export type ToolClock = {
  now: () => Date;
  nowISO: () => string;
};

export const systemClock: ToolClock = {
  now: () => new Date(),
  nowISO: () => new Date().toISOString(),
};

export const noopLogger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

/** -----------------------------
 * Config / tracing
 * ----------------------------*/
export type ToolConfig = {
  env: EnvName;
  timezone: string; // "America/Chicago"
  currency: "USD";
  flags?: Record<string, boolean>;
};

export type ToolTrace = {
  trace_id: string;
  span_id?: string;
  parent_span_id?: string;
};

/** -----------------------------
 * Prisma-typed ToolContext
 * ----------------------------*/
export type ToolContext = {
  trace: ToolTrace;
  agent: AgentName;

  user?: ToolUser;
  auth?: ToolAuth;
  request?: ToolRequest;

  db: PrismaClient;

  logger: Logger;
  clock: ToolClock;
  config: ToolConfig;
};

/** Guard: ensures db exists (and gives correct type) */
export function requireDb(ctx: ToolContext): PrismaClient {
  return ctx.db;
}

/** Create a child span for nested tool calls */
export function childSpan(ctx: ToolContext, span_id: string): ToolContext {
  return {
    ...ctx,
    trace: {
      trace_id: ctx.trace.trace_id,
      span_id,
      parent_span_id: ctx.trace.span_id,
    },
  };
}

/** Factory for API routes / server actions */
export function makeToolContext(args: {
  trace_id: string;
  agent: AgentName;
  db: PrismaClient;

  env?: EnvName;
  timezone?: string;
  currency?: "USD";
  flags?: Record<string, boolean>;

  user?: ToolUser;
  auth?: ToolAuth;
  request?: ToolRequest;

  logger?: Logger;
  clock?: ToolClock;
}): ToolContext {
  return {
    trace: { trace_id: args.trace_id },
    agent: args.agent,

    user: args.user,
    auth: args.auth,
    request: args.request,

    db: args.db,

    logger: args.logger ?? noopLogger,
    clock: args.clock ?? systemClock,
    config: {
      env: args.env ?? "dev",
      timezone: args.timezone ?? "America/Chicago",
      currency: args.currency ?? "USD",
      flags: args.flags,
    },
  };
}
