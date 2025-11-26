export type WorkflowStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

export type StepStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'SKIPPED';

export type StepType =
  | 'CREATE_LEASE'
  | 'SEND_EMAIL'
  | 'SCHEDULE_INSPECTION'
  | 'CREATE_MAINTENANCE_REQUEST'
  | 'ASSIGN_TECHNICIAN'
  | 'SEND_NOTIFICATION'
  | 'ASSIGN_PRIORITY_AI'
  | 'ASSESS_PAYMENT_RISK_AI'
  | 'PREDICT_RENEWAL_AI'
  | 'PERSONALIZE_NOTIFICATION_AI'
  | 'CONDITIONAL'
  | 'CUSTOM';

export interface WorkflowStep {
  id: string;
  type: StepType;
  name?: string;
  description?: string;
  input?: Record<string, any>;
  condition?: string; // For conditional steps
  onTrue?: string; // Next step if condition is true
  onFalse?: string; // Next step if condition is false
  handler?: (execution: WorkflowExecution, userId?: number) => Promise<any>; // For custom steps
}

export interface WorkflowExecutionStep {
  stepId: string;
  status: StepStatus;
  input: any;
  output: any;
  error: string | null;
  startedAt: Date;
  completedAt: Date | null;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: WorkflowStatus;
  input: Record<string, any>;
  output: Record<string, any>;
  steps: WorkflowExecutionStep[];
  startedAt: Date;
  completedAt: Date | null;
  error: string | null;
}

