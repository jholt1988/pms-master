import { createHash } from 'crypto';

/**
 * Standardized AI decision envelope — Phase 2A.
 *
 * Every AI endpoint returns this wrapper so consumers (operators,
 * audit systems, compliance tools) get a uniform shape regardless
 * of the specific AI task (classification, recommendation, drafting, etc.).
 *
 * The envelope is additive — it WRAPS the task-specific payload
 * (which may already have its own confidence/requiresApproval fields)
 * rather than replacing it.
 */

export interface AiDecisionEnvelope<T = Record<string, unknown>> {
  /** The task-specific result from the AI endpoint */
  result: T;

  /** Confidence score (0.0 – 1.0). < 0.7 = low confidence. */
  confidence: number;

  /** Human-readable rationale explaining how the AI arrived at this output */
  rationale: string[];

  /** Model identifier used for this invocation (e.g. "deepseek-ai/DeepSeek-V4-Pro") */
  modelVersion: string;

  /** Deterministic hash of the structured inputs (for audit trail + reproducibility) */
  inputsHash: string;

  /** Whether this decision requires explicit operator approval before acting */
  requiresApproval: boolean;

  /** Provider used (mock, openai, anthropic, etc.) */
  provider: string;

  /** ISO timestamp of invocation */
  generatedAt: string;
}

/**
 * Compute a deterministic hash of the structured inputs for auditability.
 * Uses SHA-256 of the canonical JSON serialization.
 */
export function hashInputs(inputs: Record<string, unknown>): string {
  const canonical = JSON.stringify(inputs, Object.keys(inputs).sort());
  return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}

/**
 * Determine if a confidence score requires human approval.
 * Phase 2A threshold: confidence < 0.7 OR any HIGH riskFlags trigger approval.
 */
export function confidenceRequiresApproval(
  confidence: number,
  riskFlags?: Array<{ severity?: string } | string>,
): boolean {
  if (confidence < 0.7) return true;
  if (riskFlags?.some((f) => (typeof f === 'string' ? false : f.severity === 'HIGH'))) return true;
  return false;
}

/**
 * Wrap a task-specific AI result in the standard envelope.
 */
export function wrapAiResult<T>(
  result: T,
  options: {
    confidence: number;
    rationale: string[];
    modelVersion: string;
    inputs: Record<string, unknown>;
    provider: string;
    riskFlags?: Array<{ severity?: string } | string>;
  },
): AiDecisionEnvelope<T> {
  const requiresApproval = confidenceRequiresApproval(
    options.confidence,
    options.riskFlags,
  );

  return {
    result,
    confidence: options.confidence,
    rationale: options.rationale,
    modelVersion: options.modelVersion,
    inputsHash: hashInputs(options.inputs),
    requiresApproval,
    provider: options.provider,
    generatedAt: new Date().toISOString(),
  };
}
