/**
 * Tours Service
 * Handles property tour scheduling and management
 */

import { Injectable } from '@nestjs/common';
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
    propertyId: number;
    unitId?: number;
    scheduledDate: Date;
    scheduledTime: string;
    notes?: string;
  }) {
    const tour = await this.prisma.tour.create({
      data: {
        leadId: data.leadId,
        propertyId: data.propertyId,
        unitId: data.unitId || null,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        notes: data.notes || null,
      },
      include: {
        lead: true,
        property: true,
        unit: true,
      },
    });

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
  async getTourById(id: string) {
    return this.prisma.tour.findUnique({
      where: { id },
      include: {
        lead: true,
        property: true,
        unit: true,
        conductedBy: true,
      },
    });
  }

  /**
   * Get tours for a lead
   */
  async getToursForLead(leadId: string) {
    return this.prisma.tour.findMany({
      where: { leadId },
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
  async getTours(filters?: {
    propertyId?: number;
    status?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: any = {};

    if (filters?.propertyId) {
      where.propertyId = filters.propertyId;
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
  async updateTourStatus(id: string, status: string, feedback?: string) {
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
  async assignTour(id: string, userId: number) {
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
  ) {
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
}
