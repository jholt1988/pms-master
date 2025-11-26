import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AIMaintenanceService } from '../maintenance/ai-maintenance.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { NotificationsService } from '../notifications/notifications.service';
import { Status, MaintenancePriority, NotificationType, Role } from '@prisma/client';

@Injectable()
export class MaintenanceMonitoringService {
  private readonly logger = new Logger(MaintenanceMonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiMaintenanceService: AIMaintenanceService,
    private readonly maintenanceService: MaintenanceService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Monitor maintenance requests for SLA breach risk
   * Runs every hour
   */
  @Cron(CronExpression.EVERY_HOUR, {
    name: 'monitorMaintenanceSLAs',
    timeZone: 'America/New_York',
  })
  async monitorMaintenanceSLAs() {
    this.logger.log('Starting SLA breach monitoring...');

    try {
      // Get pending high-priority requests
      const pendingRequests = await this.maintenanceService.findAll({
        status: Status.PENDING,
        priority: MaintenancePriority.HIGH,
      });

      // Also check IN_PROGRESS requests
      const inProgressRequests = await this.maintenanceService.findAll({
        status: Status.IN_PROGRESS,
      });

      const allRequests = [...pendingRequests, ...inProgressRequests];
      this.logger.log(`Checking ${allRequests.length} requests for SLA breach risk`);

      let escalatedCount = 0;
      let notifiedCount = 0;

      for (const request of allRequests) {
        try {
          const prediction = await this.aiMaintenanceService.predictSLABreach(request.id);

          if (prediction.riskLevel === 'HIGH' || prediction.riskLevel === 'CRITICAL') {
            this.logger.warn(
              `SLA breach risk detected for request ${request.id}: ` +
              `${(prediction.probability * 100).toFixed(1)}% probability (${prediction.riskLevel})`,
            );

            // Auto-escalate if critical
            if (prediction.riskLevel === 'CRITICAL' || prediction.probability > 0.8) {
              await this.escalateRequest(request.id, prediction);
              escalatedCount++;
            }

            // Notify property managers
            await this.notifyManagers(request, prediction);
            notifiedCount++;
          }
        } catch (error) {
          this.logger.error(
            `Error predicting SLA breach for request ${request.id}`,
            error instanceof Error ? error.message : String(error),
          );
        }
      }

      this.logger.log(
        `SLA monitoring complete: ${escalatedCount} escalated, ${notifiedCount} notifications sent`,
      );
    } catch (error) {
      this.logger.error('Failed to monitor maintenance SLAs:', error);
    }
  }

  /**
   * Escalate a maintenance request
   */
  private async escalateRequest(
    requestId: number,
    prediction: {
      probability: number;
      riskLevel: string;
      factors: string[];
      recommendedActions: string[];
    },
  ): Promise<void> {
    try {
      const request = await this.prisma.maintenanceRequest.findUnique({
        where: { id: requestId },
        include: {
          property: {
            include: {
              units: {
                include: {
                  lease: {
                    include: {
                      tenant: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!request) {
        return;
      }

      // Use the escalation method from MaintenanceService
      await this.maintenanceService.escalate(requestId, {
        reason: `AI predicted SLA breach risk (${(prediction.probability * 100).toFixed(1)}% probability, ${prediction.riskLevel} risk)`,
        factors: prediction.factors,
      });
      
      this.logger.log(`Escalated request ${requestId} due to SLA breach risk`);
    } catch (error) {
      this.logger.error(`Failed to escalate request ${requestId}:`, error);
    }
  }

  /**
   * Notify property managers about SLA breach risk
   */
  private async notifyManagers(
    request: any,
    prediction: {
      probability: number;
      riskLevel: string;
      factors: string[];
      recommendedActions: string[];
    },
  ): Promise<void> {
    try {
      // Get property managers
      const managers = await this.prisma.user.findMany({
        where: {
          role: Role.PROPERTY_MANAGER,
        },
      });

      if (managers.length === 0) {
        this.logger.warn('No property managers found to notify');
        return;
      }

      const message = `Maintenance Request #${request.id} "${request.title}" has ` +
        `${(prediction.probability * 100).toFixed(1)}% risk of SLA breach (${prediction.riskLevel} risk). ` +
        `Factors: ${prediction.factors.slice(0, 3).join(', ')}. ` +
        `Recommended: ${prediction.recommendedActions.slice(0, 2).join(', ')}.`;

      // Notify all managers
      const notificationType = NotificationType.MAINTENANCE_SLA_BREACH;
      
      for (const manager of managers) {
        await this.notificationsService.create({
          userId: manager.id,
          type: notificationType,
          title: `SLA Breach Risk: Request #${request.id}`,
          message,
          metadata: {
            requestId: request.id,
            riskLevel: prediction.riskLevel,
            probability: prediction.probability,
            factors: prediction.factors,
            recommendedActions: prediction.recommendedActions,
          },
          sendEmail: prediction.riskLevel === 'CRITICAL',
          useAITiming: true,
          personalize: true,
          urgency: prediction.riskLevel === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
        });
      }

      this.logger.log(`Notified ${managers.length} property managers about request ${request.id}`);
    } catch (error) {
      this.logger.error(`Failed to notify managers about request ${request.id}:`, error);
    }
  }
}

