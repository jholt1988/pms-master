/**
 * Workflow Error Codes
 * Used for structured error handling and debugging
 */
export enum WorkflowErrorCode {
  WORKFLOW_NOT_FOUND = 'WORKFLOW_NOT_FOUND',
  STEP_EXECUTION_FAILED = 'STEP_EXECUTION_FAILED',
  INVALID_INPUT = 'INVALID_INPUT',
  UNAUTHORIZED = 'UNAUTHORIZED',
  AI_SERVICE_UNAVAILABLE = 'AI_SERVICE_UNAVAILABLE',
  DATABASE_ERROR = 'DATABASE_ERROR',
  TIMEOUT = 'TIMEOUT',
  CONDITION_EVALUATION_FAILED = 'CONDITION_EVALUATION_FAILED',
  MAX_RETRIES_EXCEEDED = 'MAX_RETRIES_EXCEEDED',
}

/**
 * Custom Workflow Error class
 */
export class WorkflowError extends Error {
  constructor(
    public code: WorkflowErrorCode,
    message: string,
    public context?: Record<string, any>,
  ) {
    super(message);
    this.name = 'WorkflowError';
    Error.captureStackTrace(this, this.constructor);
  }
}

