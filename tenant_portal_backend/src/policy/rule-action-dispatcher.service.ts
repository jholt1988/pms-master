import { Injectable, Logger } from '@nestjs/common';
import { CommunicationChannel, CommunicationDirection, LedgerDirection, LedgerEntryType, NotificationType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../shared/audit-log.service';
import { RuleAction } from './rules-engine.types';

@Injectable()
export class RuleActionDispatcher {
  private readonly logger = new Logger(RuleActionDispatcher.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async dispatch(action: RuleAction, context: { propertyId: string; evaluationId: string; actorId?: string }) {
    switch (action.type) {
      case 'CREATE_ATTORNEY_REFERRAL': {
        const leaseId = typeof action.metadata?.leaseId === 'string' ? action.metadata.leaseId : null;
        const noticeId = typeof action.metadata?.noticeId === 'string' ? action.metadata.noticeId : null;
        const attorneyEmail = typeof action.metadata?.attorneyEmail === 'string' ? action.metadata.attorneyEmail : null;
        const attorneyName = typeof action.metadata?.attorneyName === 'string' ? action.metadata.attorneyName : null;
        const summary = typeof action.metadata?.summary === 'string' ? action.metadata.summary : null;

        const referral = await this.prisma.policyAttorneyReferral.create({
          data: {
            propertyId: context.propertyId,
            tenantId: action.tenantId,
            caseStatus: 'REFERRED',
            handoffMethod: String(action.metadata?.method ?? 'SECURE_EMAIL'),
            payloadJson: {
              requiredArtifacts: action.requiredArtifacts,
              metadata: action.metadata ?? {},
            } as Prisma.InputJsonValue,
          },
        });

        if (leaseId) {
          const lease = await this.prisma.lease.findUnique({
            where: { id: leaseId },
            include: {
              unit: { include: { property: true } },
            },
          });

          if (lease) {
            const communication = attorneyEmail
              ? await this.prisma.communicationLog.create({
                  data: {
                    channel: CommunicationChannel.EMAIL,
                    direction: CommunicationDirection.OUTBOUND,
                    to: attorneyEmail,
                    from: 'system',
                    subject: `Delinquency referral for lease ${lease.id}`,
                    message:
                      summary ??
                      `Attorney referral for lease ${lease.id} with unresolved delinquency balance.`,
                    metadata: {
                      workflow: 'DELINQUENCY_ATTORNEY_REFERRAL',
                      leaseId: lease.id,
                      propertyId: lease.unit?.propertyId,
                      unitId: lease.unitId,
                      tenantId: lease.tenantId,
                      attorneyName,
                      noticeId,
                      policyReferralId: referral.id,
                      ...action.metadata,
                    } as Prisma.InputJsonValue,
                    tenantId: lease.tenantId,
                    propertyId: lease.unit?.propertyId,
                    unitId: lease.unitId,
                    leaseId: lease.id,
                    createdById: context.actorId ?? null,
                  },
                })
              : null;

            await this.prisma.leaseHistory.create({
              data: {
                leaseId: lease.id,
                actorId: context.actorId ?? null,
                fromStatus: lease.status,
                toStatus: lease.status,
                note: 'Delinquency matter referred to attorney',
                metadata: {
                  legalStage: 'ATTORNEY_REFERRED',
                  attorneyEmail,
                  attorneyName,
                  noticeId,
                  policyReferralId: referral.id,
                  communicationId: communication?.id ?? null,
                },
              },
            });

            await this.prisma.notification.create({
              data: {
                userId: lease.tenantId,
                type: NotificationType.LEASE_NOTICE,
                title: 'Delinquency Matter Referred',
                message: 'Your account has been referred for legal review after unresolved delinquency.',
                metadata: {
                  workflow: 'DELINQUENCY_ATTORNEY_REFERRAL',
                  leaseId: lease.id,
                  propertyId: lease.unit?.propertyId,
                  unitId: lease.unitId,
                  noticeId,
                  policyReferralId: referral.id,
                } as Prisma.InputJsonValue,
              },
            });
          }
        }

        await this.auditLogService.record({
          actorId: context.actorId ?? null,
          module: 'POLICY',
          action: 'RULE_ACTION_CREATE_ATTORNEY_REFERRAL',
          entityType: 'PolicyAttorneyReferral',
          entityId: referral.id,
          result: 'SUCCESS',
          metadata: {
            propertyId: context.propertyId,
            evaluationId: context.evaluationId,
            tenantId: action.tenantId,
          },
        });
        return referral;
      }

      case 'APPLY_LEDGER_ENTRY': {
        const leaseId = String(action.metadata?.leaseId ?? '');
        const sourceId = String(action.metadata?.sourceId ?? `${context.evaluationId}:${action.entryType}`);
        if (!leaseId) {
          this.logger.warn(`Skipping APPLY_LEDGER_ENTRY for evaluation ${context.evaluationId}: missing leaseId`);
          return null;
        }

        const lease = await this.prisma.lease.findUnique({
          where: { id: leaseId },
          include: { unit: { include: { property: true } } },
        });
        if (!lease?.unit?.property?.organizationId) {
          this.logger.warn(`Skipping APPLY_LEDGER_ENTRY for lease ${leaseId}: missing organization context`);
          return null;
        }

        const account =
          (await this.prisma.ledgerAccount.findFirst({
            where: {
              organizationId: lease.unit.property.organizationId,
              leaseId,
            },
          })) ??
          (await this.prisma.ledgerAccount.create({
            data: {
              organizationId: lease.unit.property.organizationId,
              leaseId,
              propertyId: lease.unit.propertyId,
              unitId: lease.unitId,
              residentId: lease.tenantId,
            },
          }));

        const existing = await this.prisma.ledgerTransaction.findFirst({
          where: {
            accountId: account.id,
            sourceType: 'policy_rule',
            sourceId,
            entryType: action.entryType as LedgerEntryType,
          },
        });
        if (existing) {
          return existing;
        }

        const transaction = await this.prisma.ledgerTransaction.create({
          data: {
            accountId: account.id,
            entryType: action.entryType as LedgerEntryType,
            direction: LedgerDirection.DEBIT,
            amountCents: Math.round(action.amount * 100),
            effectiveDate: new Date(),
            categoryCode: typeof action.metadata?.categoryCode === 'string' ? action.metadata.categoryCode : undefined,
            sourceType: 'policy_rule',
            sourceId,
            description: `Policy-applied ${action.entryType.toLowerCase().replace(/_/g, ' ')}`,
            reasonCode: typeof action.metadata?.reasonCode === 'string' ? action.metadata.reasonCode : undefined,
            metadata: action.metadata as Prisma.InputJsonValue | undefined,
          },
        });

        const invoiceIdRaw = action.metadata?.rentChargeId;
        if (invoiceIdRaw) {
          const invoiceIdStr = String(invoiceIdRaw);
          const existingLateFee = await this.prisma.lateFee.findFirst({
            where: {
              invoiceId: invoiceIdStr,
              waived: false,
            },
          });

          if (!existingLateFee) {
            await this.prisma.lateFee.create({
              data: {
                invoiceId: invoiceIdStr,
                amountCents: typeof action.amount === 'number' ? Math.round(action.amount * 100) : action.amount,
              },
            });
          }
        }

        await this.auditLogService.record({
          actorId: context.actorId ?? null,
          module: 'POLICY',
          action: 'RULE_ACTION_APPLY_LEDGER_ENTRY',
          entityType: 'LedgerTransaction',
          entityId: transaction.id,
          result: 'SUCCESS',
          metadata: {
            propertyId: context.propertyId,
            evaluationId: context.evaluationId,
            leaseId,
            tenantId: action.tenantId,
            sourceId,
          },
        });
        return transaction;
      }

      case 'GENERATE_DOCUMENT': {
        const propertyId = typeof action.metadata?.propertyId === 'string' ? action.metadata.propertyId : context.propertyId;
        const tenantId = typeof action.metadata?.applicantId === 'string' ? action.metadata.applicantId : null;
        const appId = typeof action.metadata?.applicationId === 'string' ? action.metadata.applicationId : null;
        const communication = await this.prisma.communicationLog.create({
          data: {
            channel: CommunicationChannel.INTERNAL,
            direction: CommunicationDirection.OUTBOUND,
            to: tenantId ?? 'applicant',
            from: 'system',
            subject: `${action.documentType} generated`,
            message: `Policy evaluation generated ${action.documentType} using template ${action.templateVersion}.`,
            metadata: {
              evaluationId: context.evaluationId,
              documentType: action.documentType,
              templateVersion: action.templateVersion,
              applicationId: appId,
              ...action.metadata,
            } as Prisma.InputJsonValue,
            propertyId,
            tenantId,
          },
        });

        if (tenantId) {
          await this.prisma.notification.create({
            data: {
              userId: tenantId,
              type: NotificationType.APPLICATION_STATUS_CHANGE,
              title: 'Application Decision Notice Ready',
              message: 'A decision notice has been prepared for your rental application.',
              metadata: {
                evaluationId: context.evaluationId,
                documentType: action.documentType,
                applicationId: appId,
              } as Prisma.InputJsonValue,
            },
          });
        }

        return communication;
      }

      case 'SEND_NOTIFICATION':
      case 'CREATE_SERVICE_PROOF_REQUIREMENT':
      case 'CREATE_PAYMENT_PLAN_PROPOSAL':
      case 'DISPATCH_AFTER_HOURS_VENDOR':
        this.logger.log(`Policy action ${action.type} recorded but not yet fully dispatched`);
        return null;
      default:
        return null;
    }
  }
}
