import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../shared/audit-log.service';

@Injectable()
export class PrivacyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {}

  async exportUserData(userId: string, orgId?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        ...(orgId ? { organizations: { some: { organizationId: orgId } } } : {}),
      },
      include: {
        lease: true,
        rentalApplications: true,
        sentMessages: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        manualPayments: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        manualCharges: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
        notifications: {
          orderBy: { createdAt: 'desc' },
          take: 100,
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const payload = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phoneNumber: user.phoneNumber,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      lease: user.lease,
      rentalApplications: user.rentalApplications,
      messages: user.sentMessages,
      payments: user.payments,
      manualPayments: user.manualPayments,
      manualCharges: user.manualCharges,
      notifications: user.notifications,
    };

    await this.auditLog.record({
      orgId,
      actorId: null,
      module: 'privacy',
      action: 'EXPORT_USER_DATA',
      entityType: 'user',
      entityId: userId,
      result: 'SUCCESS',
      metadata: {
        exportSections: Object.keys(payload),
      },
    });

    return payload;
  }

  async anonymizeUserData(userId: string, orgId?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        id: userId,
        ...(orgId ? { organizations: { some: { organizationId: orgId } } } : {}),
      },
      select: {
        id: true,
        username: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const anonymizedUsername = `anonymized_${user.id.slice(0, 8)}`;
    const anonymizedEmail = `${anonymizedUsername}@redacted.local`;

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          username: anonymizedUsername,
          email: anonymizedEmail,
          firstName: 'Redacted',
          lastName: 'User',
          phoneNumber: null,
          socialSecurityNumber: null,
          socialSecurityImage: null,
          driverLicenseNumber: null,
          driverLicenseImage: null,
          stripeCustomerId: null,
          mfaEnabled: false,
          mfaSecret: null,
          mfaTempSecret: null,
        },
      });

      await tx.message.updateMany({
        where: { senderId: user.id },
        data: {
          content: '[REDACTED_PER_PRIVACY_REQUEST]',
          metadata: {
            redacted: true,
            reason: 'Right to be forgotten request',
          } as any,
        },
      });

      await tx.rentalApplication.updateMany({
        where: { applicantId: user.id },
        data: {
          fullName: 'Redacted Applicant',
          email: anonymizedEmail,
          phoneNumber: '[REDACTED]',
          previousAddress: '[REDACTED]',
          rentalHistoryComments: '[REDACTED]',
          screeningDetails: '[REDACTED_PER_PRIVACY_REQUEST]',
          screeningReasons: {
            redacted: true,
            reason: 'Right to be forgotten request',
          } as any,
          ai_summary: '[REDACTED_PER_PRIVACY_REQUEST]',
        },
      });

      await tx.rentalApplicationNote.updateMany({
        where: { authorId: user.id },
        data: {
          body: '[REDACTED_PER_PRIVACY_REQUEST]',
        },
      });

      await tx.communicationLog.updateMany({
        where: {
          OR: [{ tenantId: user.id }, { createdById: user.id }],
        },
        data: {
          to: '[REDACTED]',
          from: '[REDACTED]',
          subject: '[REDACTED]',
          message: '[REDACTED_PER_PRIVACY_REQUEST]',
          metadata: {
            redacted: true,
            reason: 'Right to be forgotten request',
          } as any,
        },
      });
    });

    await this.auditLog.record({
      orgId,
      actorId: null,
      module: 'privacy',
      action: 'ANONYMIZE_USER_DATA',
      entityType: 'user',
      entityId: userId,
      result: 'SUCCESS',
      metadata: {
        previousUsername: user.username,
        previousEmail: user.email,
        anonymizedUsername,
      },
    });

    return {
      userId,
      anonymizedUsername,
      anonymizedEmail,
      status: 'ANONYMIZED',
    };
  }
}
