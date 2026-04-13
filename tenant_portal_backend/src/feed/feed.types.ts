import type { Role } from '@prisma/client';

export type CanonicalUserRole = Role;

export interface CanonicalFeedMetadata {
  reasoning?: string[];
  type?: 'approval' | 'review' | 'escalation';
  confidenceScore?: number;
  impact?: {
    financial?: number;
    timeline?: string;
    risk?: 'low' | 'medium' | 'high';
  };
  relatedDecisionIds?: string[];
  workflow?: {
    stage: string;
    totalStages?: number;
    currentStageIndex?: number;
    eta?: string;
  };
  notes?: unknown[];
  [key: string]: unknown;
}

export interface CanonicalFeedAction {
  id: string;
  type: 'mutation' | 'navigation';
  label: string;
  variant: 'default' | 'primary' | 'secondary' | 'destructive';
  intent?: string;
  href?: string;
  requiresConfirm?: boolean;
  openInNewTab?: boolean;
  description?: string;
  tooltip?: string;
  confirmation?: {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface CanonicalFeedItem {
  id: string;
  kind: 'critical_signal' | 'decision' | 'scheduled_event' | 'update';
  domain: 'payments' | 'leasing' | 'screening' | 'maintenance' | 'calendar';
  title: string;
  summary: string;
  priority: number;
  timestamp: string;
  actions: CanonicalFeedAction[];
  allowedRoles: CanonicalUserRole[];
  propertyId?: string;
  metadata?: CanonicalFeedMetadata;
}

export interface CanonicalFeedResponse {
  items: CanonicalFeedItem[];
  role: CanonicalUserRole;
  generatedAt: string;
}
