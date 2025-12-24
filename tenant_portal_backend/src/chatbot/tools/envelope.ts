export type SourceType = 'url' | 'db' | 'vendor' | 'manual';

export interface ToolSource {
  type: SourceType;
  ref: string;
  note?: string;
}

export interface ToolMeta {
  trace_id: string;
  sources: ToolSource[];
  latency_ms: number;
}

export interface ToolOk<TData> {
  ok: true;
  data: TData;
  meta: ToolMeta;
}

export interface ToolError {
  ok: false;
  error: { code: string; message: string; retryable: boolean };
  meta: ToolMeta;
}

export type ToolResponse<TData> = ToolOk<TData> | ToolError;

export function success<TData>(data: TData, sources: ToolSource[] = []): ToolOk<TData> {
  return {
    ok: true,
    data,
    meta: {
      trace_id: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sources,
      latency_ms: 0,
    },
  };
}

export function failure(code: string, message: string, retryable = false): ToolError {
  return {
    ok: false,
    error: { code, message, retryable },
    meta: {
      trace_id: `trace_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sources: [],
      latency_ms: 0,
    },
  };
}
