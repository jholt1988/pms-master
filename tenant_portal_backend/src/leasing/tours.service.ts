/**
 * Tours Service
 * Handles property tour scheduling and management
 */

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Injectable()
export class ToursService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Schedule a property tour
   */
  async scheduleTour(data: {
    leadId: string;
    propertyId: string;
    unitId?: string;
    scheduledDate: Date;
    scheduledTime: string;
    notes?: string;
  }) {
    const propertyId = String(data.propertyId);
    const unitId = data.unitId ? String(data.unitId) : undefined;
    const tour = await this.prisma.tour.create({
      data: {
        leadId: data.leadId,
        propertyId,
        unitId: unitId ?? null,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        notes: data.notes || null,
      },
      include: {
        lead: true,
        property: true,
        unit: true,
      },
    }) as any;

    // Send tour confirmation email to lead
    if (tour.lead.email) {
      await this.emailService.sendTourConfirmationEmail(tour, tour.lead, tour.property)
        .catch(err => console.error('Failed to send tour confirmation:', err));
    }

    return tour;
  }

  /**
   * Get tour by ID
   */
  async getTourById(id: string, orgId?: string) {
    const include = {
      lead: true,
      property: true,
      unit: true,
      conductedBy: true,
    };
    if (orgId) {
      return this.prisma.tour.findFirst({
        where: { id, property: { organizationId: orgId } },
        include,
      });
    }
    return this.prisma.tour.findUnique({
      where: { id },
      include,
    });
  }

  /**
   * Get tours for a lead
   */
  async getToursForLead(leadId: string, orgId?: string) {
    return this.prisma.tour.findMany({
      where: {
        leadId,
        ...(orgId ? { property: { organizationId: orgId } } : {}),
      },
      include: {
        property: true,
        unit: true,
        conductedBy: true,
      },
      orderBy: { scheduledDate: 'desc' },
    });
  }

  /**
   * Get all tours with filtering
   */
  async getTours(
    filters?: {
      propertyId?: string;
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    },
    orgId?: string,
  ) {
    const where: any = {};

    if (orgId) {
      where.property = { organizationId: orgId };
    }

    if (filters?.propertyId) {
      where.propertyId = String(filters.propertyId);
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.scheduledDate = {};
      if (filters.dateFrom) where.scheduledDate.gte = filters.dateFrom;
      if (filters.dateTo) where.scheduledDate.lte = filters.dateTo;
    }

    const [tours, total] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        include: {
          lead: true,
          property: true,
          unit: true,
          conductedBy: true,
        },
        orderBy: { scheduledDate: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.tour.count({ where }),
    ]);

    return { tours, total };
  }

  /**
   * Update tour status
   */
  async updateTourStatus(
    id: string,
    status: string,
    feedback?: string,
    orgId?: string,
  ) {
    await this.assertTourInOrg(id, orgId);

    const updates: any = { status };

    if (status === 'COMPLETED') {
      updates.completedAt = new Date();
    }

    if (status === 'CANCELLED') {
      updates.cancelledAt = new Date();
    }

    if (feedback) {
      updates.feedback = feedback;
    }

    return this.prisma.tour.update({
      where: { id },
      data: updates,
    });
  }

  /**
   * Assign tour to property manager
   */
  async assignTour(id: string, userId: string, orgId?: string) {
    await this.assertTourInOrg(id, orgId);

    return this.prisma.tour.update({
      where: { id },
      data: { conductedById: userId },
    });
  }

  /**
   * Reschedule tour
   */
  async rescheduleTour(
    id: string,
    scheduledDate: Date,
    scheduledTime: string,
    orgId?: string,
  ) {
    await this.assertTourInOrg(id, orgId);

    return this.prisma.tour.update({
      where: { id },
      data: {
        scheduledDate,
        scheduledTime,
        status: 'RESCHEDULED',
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Verifies a tour belongs to the caller's organization (via its property).
   * No-op when orgId is undefined (internal / non-org callers). Throws NotFound
   * when the tour is missing or outside the org so cross-org ids are
   * indistinguishable from non-existent ones.
   */
  private async assertTourInOrg(id: string, orgId?: string): Promise<void> {
    if (!orgId) {
      return;
    }
    const found = await this.prisma.tour.findFirst({
      where: { id, property: { organizationId: orgId } },
      select: { id: true },
    });
    if (!found) {
      throw new NotFoundException('Tour not found');
    }
  }

  private parseNumericId(value: string | number, field: string): string {
    if (typeof value !== 'string' || !isUUID(value)) {
      throw new BadRequestException(`Invalid ${field} id: ${value}`);
    }
    return String(value);
  }
}
