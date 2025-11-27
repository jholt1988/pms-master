import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ApplicationStatus,
  QualificationStatus,
  Recommendation,
  Role,
  NotificationType,
} from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';

export interface ApplicationLifecycleEvent {
  id: number;
  applicationId: number;
  eventType: ApplicationLifecycleEventType;
  fromStatus?: ApplicationStatus;
  toStatus: ApplicationStatus;
  performedBy?: {
    userId: number;
    username: string;
    role: Role;
  };
  metadata?: Record<string, any>;
  timestamp: Date;
}

export enum ApplicationLifecycleEventType {
  SUBMITTED = 'SUBMITTED',
  UNDER_REVIEW = 'UNDER_REVIEW',
  SCREENING_STARTED = 'SCREENING_STARTED',
  SCREENING_COMPLETED = 'SCREENING_COMPLETED',
  BACKGROUND_CHECK_REQUESTED = 'BACKGROUND_CHECK_REQUESTED',
  BACKGROUND_CHECK_COMPLETED = 'BACKGROUND_CHECK_COMPLETED',
  DOCUMENTS_REQUESTED = 'DOCUMENTS_REQUESTED',
  DOCUMENTS_RECEIVED = 'DOCUMENTS_RECEIVED',
  INTERVIEW_SCHEDULED = 'INTERVIEW_SCHEDULED',
  INTERVIEW_COMPLETED = 'INTERVIEW_COMPLETED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
  NOTE_ADDED = 'NOTE_ADDED',
  STATUS_CHANGED = 'STATUS_CHANGED',
}

export interface StatusTransition {
  from: ApplicationStatus | null;
  to: ApplicationStatus;
  allowedRoles: Role[];
  requiresScreening?: boolean;
  requiresDocuments?: boolean;
  eventType: ApplicationLifecycleEventType;
  description: string;
}

@Injectable()
export class ApplicationLifecycleService {
  // Define valid status transitions
  private readonly statusTransitions: Map<ApplicationStatus, StatusTransition[]> = new Map([
    [ApplicationStatus.PENDING, [
      {
        from: ApplicationStatus.PENDING,
        to: ApplicationStatus.UNDER_REVIEW,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.UNDER_REVIEW,
        description: 'Application moved to under review',
      },
      {
        from: ApplicationStatus.PENDING,
        to: ApplicationStatus.SCREENING,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.SCREENING_STARTED,
        description: 'Screening started',
      },
      {
        from: ApplicationStatus.PENDING,
        to: ApplicationStatus.REJECTED,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.REJECTED,
        description: 'Application rejected',
      },
      {
        from: ApplicationStatus.PENDING,
        to: ApplicationStatus.WITHDRAWN,
        allowedRoles: [Role.TENANT, Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.WITHDRAWN,
        description: 'Application withdrawn',
      },
    ]],
    [ApplicationStatus.UNDER_REVIEW, [
      {
        from: ApplicationStatus.UNDER_REVIEW,
        to: ApplicationStatus.SCREENING,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.SCREENING_STARTED,
        description: 'Screening started',
      },
      {
        from: ApplicationStatus.UNDER_REVIEW,
        to: ApplicationStatus.BACKGROUND_CHECK,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.BACKGROUND_CHECK_REQUESTED,
        description: 'Background check requested',
      },
      {
        from: ApplicationStatus.UNDER_REVIEW,
        to: ApplicationStatus.DOCUMENTS_REVIEW,
        allowedRoles: [Role.PROPERTY_MANAGER],
        requiresDocuments: true,
        eventType: ApplicationLifecycleEventType.DOCUMENTS_REQUESTED,
        description: 'Documents requested',
      },
      {
        from: ApplicationStatus.UNDER_REVIEW,
        to: ApplicationStatus.APPROVED,
        allowedRoles: [Role.PROPERTY_MANAGER],
        requiresScreening: true,
        eventType: ApplicationLifecycleEventType.APPROVED,
        description: 'Application approved',
      },
      {
        from: ApplicationStatus.UNDER_REVIEW,
        to: ApplicationStatus.REJECTED,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.REJECTED,
        description: 'Application rejected',
      },
    ]],
    [ApplicationStatus.SCREENING, [
      {
        from: ApplicationStatus.SCREENING,
        to: ApplicationStatus.BACKGROUND_CHECK,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.BACKGROUND_CHECK_REQUESTED,
        description: 'Background check requested',
      },
      {
        from: ApplicationStatus.SCREENING,
        to: ApplicationStatus.UNDER_REVIEW,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.SCREENING_COMPLETED,
        description: 'Screening completed, back to review',
      },
      {
        from: ApplicationStatus.SCREENING,
        to: ApplicationStatus.APPROVED,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.APPROVED,
        description: 'Application approved after screening',
      },
      {
        from: ApplicationStatus.SCREENING,
        to: ApplicationStatus.REJECTED,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.REJECTED,
        description: 'Application rejected after screening',
      },
    ]],
    [ApplicationStatus.BACKGROUND_CHECK, [
      {
        from: ApplicationStatus.BACKGROUND_CHECK,
        to: ApplicationStatus.INTERVIEW,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.INTERVIEW_SCHEDULED,
        description: 'Interview scheduled',
      },
      {
        from: ApplicationStatus.BACKGROUND_CHECK,
        to: ApplicationStatus.UNDER_REVIEW,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.BACKGROUND_CHECK_COMPLETED,
        description: 'Background check completed',
      },
      {
        from: ApplicationStatus.BACKGROUND_CHECK,
        to: ApplicationStatus.APPROVED,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.APPROVED,
        description: 'Application approved',
      },
      {
        from: ApplicationStatus.BACKGROUND_CHECK,
        to: ApplicationStatus.REJECTED,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.REJECTED,
        description: 'Application rejected',
      },
    ]],
    [ApplicationStatus.DOCUMENTS_REVIEW, [
      {
        from: ApplicationStatus.DOCUMENTS_REVIEW,
        to: ApplicationStatus.UNDER_REVIEW,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.DOCUMENTS_RECEIVED,
        description: 'Documents received and reviewed',
      },
      {
        from: ApplicationStatus.DOCUMENTS_REVIEW,
        to: ApplicationStatus.APPROVED,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.APPROVED,
        description: 'Application approved',
      },
      {
        from: ApplicationStatus.DOCUMENTS_REVIEW,
        to: ApplicationStatus.REJECTED,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.REJECTED,
        description: 'Application rejected',
      },
    ]],
    [ApplicationStatus.INTERVIEW, [
      {
        from: ApplicationStatus.INTERVIEW,
        to: ApplicationStatus.UNDER_REVIEW,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.INTERVIEW_COMPLETED,
        description: 'Interview completed',
      },
      {
        from: ApplicationStatus.INTERVIEW,
        to: ApplicationStatus.APPROVED,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.APPROVED,
        description: 'Application approved after interview',
      },
      {
        from: ApplicationStatus.INTERVIEW,
        to: ApplicationStatus.REJECTED,
        allowedRoles: [Role.PROPERTY_MANAGER],
        eventType: ApplicationLifecycleEventType.REJECTED,
        description: 'Application rejected after interview',
      },
    ]],
  ]);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Get the current lifecycle stage based on application data
   */
  getCurrentLifecycleStage(application: any): {
    stage: string;
    status: ApplicationStatus;
    progress: number;
    nextSteps: string[];
  } {
    const stages = this.getLifecycleStages();
    let currentStageIndex = 0;
    let progress = 0;

    // Determine current stage based on application state
    if (application.status === ApplicationStatus.APPROVED) {
      currentStageIndex = stages.length - 1;
      progress = 100;
    } else if (application.status === ApplicationStatus.REJECTED) {
      return {
        stage: 'Rejected',
        status: ApplicationStatus.REJECTED,
        progress: 0,
        nextSteps: ['Contact property manager for details'],
      };
    } else if (application.status === ApplicationStatus.WITHDRAWN) {
      return {
        stage: 'Withdrawn',
        status: ApplicationStatus.WITHDRAWN,
        progress: 0,
        nextSteps: ['Application has been withdrawn'],
      };
    } else if (application.status === ApplicationStatus.INTERVIEW) {
      currentStageIndex = 5; // Interview
      progress = 85;
    } else if (application.status === ApplicationStatus.DOCUMENTS_REVIEW) {
      currentStageIndex = 4; // Documents Review
      progress = 70;
    } else if (application.status === ApplicationStatus.BACKGROUND_CHECK) {
      currentStageIndex = 3; // Background Check
      progress = 60;
    } else if (application.status === ApplicationStatus.SCREENING || application.screenedAt) {
      currentStageIndex = 2; // Screening
      progress = 40;
    } else if (application.status === ApplicationStatus.UNDER_REVIEW) {
      currentStageIndex = 1; // Under review
      progress = 20;
    } else if (application.status === ApplicationStatus.PENDING) {
      currentStageIndex = 0; // Submitted
      progress = 10;
    }

    const currentStage = stages[currentStageIndex];
    const nextSteps = this.getNextSteps(application, currentStageIndex);

    return {
      stage: currentStage.name,
      status: application.status,
      progress,
      nextSteps,
    };
  }

  /**
   * Get all lifecycle stages
   */
  getLifecycleStages(): Array<{ name: string; description: string; order: number }> {
    return [
      {
        name: 'Submitted',
        description: 'Application has been submitted and received',
        order: 1,
      },
      {
        name: 'Under Review',
        description: 'Application is being reviewed by property manager',
        order: 2,
      },
      {
        name: 'Screening',
        description: 'Application is undergoing automated screening',
        order: 3,
      },
      {
        name: 'Background Check',
        description: 'Background and credit check in progress',
        order: 4,
      },
      {
        name: 'Documents Review',
        description: 'Additional documents are being reviewed',
        order: 5,
      },
      {
        name: 'Interview',
        description: 'Interview scheduled or completed',
        order: 6,
      },
      {
        name: 'Decision',
        description: 'Final decision pending or made',
        order: 7,
      },
    ];
  }

  /**
   * Get next steps for an application
   */
  private getNextSteps(application: any, currentStageIndex: number): string[] {
    const steps: string[] = [];

    if (currentStageIndex === 0) {
      steps.push('Wait for property manager to review your application');
    } else if (currentStageIndex === 1) {
      if (!application.screenedAt) {
        steps.push('Automated screening will be performed');
      }
      steps.push('Background check may be requested');
    } else if (currentStageIndex === 2) {
      steps.push('Wait for screening results');
      steps.push('Prepare additional documents if requested');
    } else if (currentStageIndex === 3) {
      steps.push('Background check may be initiated');
      steps.push('Interview may be scheduled');
    } else if (currentStageIndex === 4) {
      steps.push('Wait for background check completion');
    } else if (currentStageIndex === 5) {
      steps.push('Final decision will be made soon');
    }

    return steps;
  }

  /**
   * Record a lifecycle event
   */
  async recordLifecycleEvent(
    applicationId: number,
    eventType: ApplicationLifecycleEventType,
    fromStatus: ApplicationStatus | null,
    toStatus: ApplicationStatus,
    performedBy: { userId: number; username: string; role: Role },
    metadata?: Record<string, any>,
  ): Promise<ApplicationLifecycleEvent> {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    // Persist event to database
    const event = await this.prisma.applicationLifecycleEvent.create({
      data: {
        applicationId,
        eventType: eventType.toString(),
        fromStatus: fromStatus || null,
        toStatus,
        performedById: performedBy.userId,
        metadata: metadata || {},
      },
      include: {
        performedBy: {
          select: {
            id: true,
            username: true,
            role: true,
          },
        },
      },
    });

    // Convert to ApplicationLifecycleEvent interface
    const lifecycleEvent: ApplicationLifecycleEvent = {
      id: event.id,
      applicationId: event.applicationId,
      eventType,
      fromStatus: event.fromStatus || undefined,
      toStatus: event.toStatus,
      performedBy: event.performedBy ? {
        userId: event.performedBy.id,
        username: event.performedBy.username,
        role: event.performedBy.role as Role,
      } : undefined,
      metadata: (event.metadata as Record<string, any>) || {},
      timestamp: event.createdAt,
    };

    // Send notification based on event type
    await this.sendLifecycleNotification(applicationId, lifecycleEvent);

    return lifecycleEvent;
  }

  /**
   * Send notification for lifecycle event
   */
  private async sendLifecycleNotification(
    applicationId: number,
    event: ApplicationLifecycleEvent,
  ): Promise<void> {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id: applicationId },
      include: { applicant: true, property: true, unit: true },
    });

    if (!application || !application.applicant) {
      return;
    }

    const message = this.getNotificationMessage(event);
    const title = this.getNotificationTitle(event);

    await this.notificationsService.create({
      userId: application.applicant.id,
      type: NotificationType.APPLICATION_STATUS_CHANGE,
      title,
      message,
      metadata: {
        applicationId,
        eventType: event.eventType,
        status: event.toStatus,
      },
    });
  }

  /**
   * Get notification message for event
   */
  private getNotificationMessage(event: ApplicationLifecycleEvent): string {
    const application = event.metadata?.applicationNumber || `#${event.applicationId}`;
    
    switch (event.eventType) {
      case ApplicationLifecycleEventType.SUBMITTED:
        return `Your rental application ${application} has been received and is being processed.`;
      case ApplicationLifecycleEventType.UNDER_REVIEW:
        return `Your application ${application} is now under review by our team.`;
      case ApplicationLifecycleEventType.SCREENING_STARTED:
        return `Automated screening has started for your application ${application}.`;
      case ApplicationLifecycleEventType.SCREENING_COMPLETED:
        return `Screening completed for your application ${application}. Review in progress.`;
      case ApplicationLifecycleEventType.BACKGROUND_CHECK_REQUESTED:
        return `Background check has been requested for your application ${application}.`;
      case ApplicationLifecycleEventType.BACKGROUND_CHECK_COMPLETED:
        return `Background check completed for your application ${application}.`;
      case ApplicationLifecycleEventType.DOCUMENTS_REQUESTED:
        return `Additional documents are required for your application ${application}. Please check your email.`;
      case ApplicationLifecycleEventType.DOCUMENTS_RECEIVED:
        return `Documents received for your application ${application}. Review in progress.`;
      case ApplicationLifecycleEventType.INTERVIEW_SCHEDULED:
        return `An interview has been scheduled for your application ${application}. Check your email for details.`;
      case ApplicationLifecycleEventType.APPROVED:
        return `Congratulations! Your application ${application} has been approved.`;
      case ApplicationLifecycleEventType.REJECTED:
        return `Your application ${application} status has been updated. Please check your email for details.`;
      case ApplicationLifecycleEventType.WITHDRAWN:
        return `Your application ${application} has been withdrawn.`;
      default:
        return `Your application ${application} status has been updated.`;
    }
  }

  /**
   * Get notification title for event
   */
  private getNotificationTitle(event: ApplicationLifecycleEvent): string {
    switch (event.eventType) {
      case ApplicationLifecycleEventType.SUBMITTED:
        return 'Application Received';
      case ApplicationLifecycleEventType.UNDER_REVIEW:
        return 'Application Under Review';
      case ApplicationLifecycleEventType.SCREENING_STARTED:
        return 'Screening Started';
      case ApplicationLifecycleEventType.SCREENING_COMPLETED:
        return 'Screening Completed';
      case ApplicationLifecycleEventType.BACKGROUND_CHECK_REQUESTED:
        return 'Background Check Requested';
      case ApplicationLifecycleEventType.BACKGROUND_CHECK_COMPLETED:
        return 'Background Check Completed';
      case ApplicationLifecycleEventType.DOCUMENTS_REQUESTED:
        return 'Documents Required';
      case ApplicationLifecycleEventType.DOCUMENTS_RECEIVED:
        return 'Documents Received';
      case ApplicationLifecycleEventType.INTERVIEW_SCHEDULED:
        return 'Interview Scheduled';
      case ApplicationLifecycleEventType.APPROVED:
        return 'Application Approved!';
      case ApplicationLifecycleEventType.REJECTED:
        return 'Application Status Update';
      case ApplicationLifecycleEventType.WITHDRAWN:
        return 'Application Withdrawn';
      default:
        return 'Application Update';
    }
  }

  /**
   * Get timeline of events for an application
   */
  async getApplicationTimeline(applicationId: number): Promise<ApplicationLifecycleEvent[]> {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id: applicationId },
      include: {
        lifecycleEvents: {
          include: {
            performedBy: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    // Convert database events to ApplicationLifecycleEvent interface
    const timeline: ApplicationLifecycleEvent[] = application.lifecycleEvents.map(event => ({
      id: event.id,
      applicationId: event.applicationId,
      eventType: event.eventType as ApplicationLifecycleEventType,
      fromStatus: event.fromStatus || undefined,
      toStatus: event.toStatus,
      performedBy: event.performedBy ? {
        userId: event.performedBy.id,
        username: event.performedBy.username,
        role: event.performedBy.role as Role,
      } : undefined,
      metadata: (event.metadata as Record<string, any>) || {},
      timestamp: event.createdAt,
    }));

    // If no events exist, create a default submission event from application data
    if (timeline.length === 0) {
      timeline.push({
        id: 0,
        applicationId,
        eventType: ApplicationLifecycleEventType.SUBMITTED,
        toStatus: ApplicationStatus.PENDING,
        timestamp: application.applicationDate || application.createdAt,
      });
    }

    return timeline;
  }

  /**
   * Validate status transition
   */
  canTransition(
    fromStatus: ApplicationStatus,
    toStatus: ApplicationStatus,
    userRole: Role,
  ): boolean {
    if (fromStatus === toStatus) {
      return true; // No-op transitions are allowed
    }

    const transitions = this.statusTransitions.get(fromStatus) || [];
    const validTransition = transitions.find(t => t.to === toStatus);

    if (!validTransition) {
      return false;
    }

    return validTransition.allowedRoles.includes(userRole);
  }

  /**
   * Get available transitions for a status and role
   */
  getAvailableTransitions(
    fromStatus: ApplicationStatus,
    userRole: Role,
  ): StatusTransition[] {
    const transitions = this.statusTransitions.get(fromStatus) || [];
    return transitions.filter(t => t.allowedRoles.includes(userRole));
  }

  /**
   * Transition application status with validation and event recording
   */
  async transitionStatus(
    applicationId: number,
    toStatus: ApplicationStatus,
    performedBy: { userId: number; username: string; role: Role },
    metadata?: Record<string, any>,
  ): Promise<ApplicationLifecycleEvent> {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new BadRequestException('Application not found');
    }

    // Validate transition
    if (!this.canTransition(application.status, toStatus, performedBy.role)) {
      throw new BadRequestException(
        `Invalid status transition from ${application.status} to ${toStatus} for role ${performedBy.role}`,
      );
    }

    // Get transition details
    const transitions = this.statusTransitions.get(application.status) || [];
    const transition = transitions.find(t => t.to === toStatus);

    // Update application status
    await this.prisma.rentalApplication.update({
      where: { id: applicationId },
      data: { status: toStatus },
    });

    // Record lifecycle event
    const eventType = transition?.eventType || ApplicationLifecycleEventType.STATUS_CHANGED;
    return this.recordLifecycleEvent(
      applicationId,
      eventType,
      application.status,
      toStatus,
      performedBy,
      metadata,
    );
  }
}

