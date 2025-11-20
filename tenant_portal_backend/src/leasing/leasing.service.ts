/**
 * Leasing Service
 * Handles lead management, property search, and conversation tracking
 */

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { Lead, LeadStatus, LeadMessage, MessageRole, PropertyInquiry, InterestLevel, Prisma } from '@prisma/client';

@Injectable()
export class LeasingService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Create or update a lead
   */
  async upsertLead(sessionId: string, data: Partial<Lead>): Promise<Lead> {
    const isNewLead = !(await this.prisma.lead.findUnique({ where: { sessionId } }));
    
    const lead = await this.prisma.lead.upsert({
      where: { sessionId },
      create: {
        sessionId,
        ...data,
      },
      update: {
        ...data,
        updatedAt: new Date(),
      },
    });

    // Send welcome email to new leads with email address
    if (isNewLead && lead.email) {
      await this.emailService.sendLeadWelcomeEmail({
        name: lead.name || undefined,
        email: lead.email,
      }).catch(err => console.error('Failed to send welcome email:', err));
    }

    // Notify property managers of qualified leads
    if (isNewLead && lead.status === LeadStatus.QUALIFIED && lead.email) {
      const propertyManagers = await this.prisma.user.findMany({
        where: { role: 'PROPERTY_MANAGER' },
        select: { username: true },
      });
      
      for (const pm of propertyManagers) {
        await this.emailService.sendNewLeadNotificationToPM(pm.username, lead)
          .catch(err => console.error(`Failed to notify PM ${pm.username}:`, err));
      }
    }

    return lead;
  }

  /**
   * Get lead by session ID
   */
  async getLeadBySessionId(sessionId: string): Promise<Lead | null> {
    return this.prisma.lead.findUnique({
      where: { sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        propertyInquiries: {
          include: {
            property: true,
            unit: true,
          },
        },
        tours: {
          include: {
            property: true,
            unit: true,
          },
        },
        applications: {
          include: {
            property: true,
            unit: true,
          },
        },
      },
    });
  }

  /**
   * Get lead by ID
   */
  async getLeadById(id: string): Promise<Lead | null> {
    return this.prisma.lead.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
        propertyInquiries: {
          include: {
            property: true,
            unit: true,
          },
        },
        tours: {
          include: {
            property: true,
            unit: true,
          },
        },
        applications: {
          include: {
            property: true,
            unit: true,
          },
        },
      },
    });
  }

  /**
   * Get all leads with filtering
   */
  async getLeads(filters?: {
    status?: LeadStatus;
    search?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Prisma.LeadWhereInput = {};

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
        { phone: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    if (filters?.dateFrom || filters?.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
      if (filters.dateTo) where.createdAt.lte = filters.dateTo;
    }

    const [leads, total] = await Promise.all([
      this.prisma.lead.findMany({
        where,
        include: {
          _count: {
            select: {
              messages: true,
              tours: true,
              applications: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: filters?.limit || 50,
        skip: filters?.offset || 0,
      }),
      this.prisma.lead.count({ where }),
    ]);

    return { leads, total };
  }

  /**
   * Add message to conversation
   */
  async addMessage(
    leadId: string,
    role: MessageRole,
    content: string,
    metadata?: any,
  ): Promise<LeadMessage> {
    return this.prisma.leadMessage.create({
      data: {
        leadId,
        role,
        content,
        metadata: metadata || Prisma.JsonNull,
      },
    });
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(leadId: string): Promise<LeadMessage[]> {
    return this.prisma.leadMessage.findMany({
      where: { leadId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Search properties based on lead criteria
   */
  async searchProperties(criteria: {
    bedrooms?: number;
    bathrooms?: number;
    maxRent?: number;
    petFriendly?: boolean;
    amenities?: string[];
    limit?: number;
  }) {
    const where: Prisma.UnitWhereInput = {
      lease: null, // Only available units
    };

    if (criteria.bedrooms !== undefined) {
      where.bedrooms = criteria.bedrooms;
    }

    if (criteria.bathrooms !== undefined) {
      where.bathrooms = { gte: criteria.bathrooms };
    }

    if (criteria.petFriendly) {
      where.petsAllowed = true;
    }

    // For rent filtering, we'd need to add current rent to Unit model
    // For now, we'll return all matching units

    const units = await this.prisma.unit.findMany({
      where,
      include: {
        property: true,
      },
      take: criteria.limit || 10,
    });

    // Transform to match frontend PropertyMatch interface
    return units.map((unit) => ({
      propertyId: unit.property.id.toString(),
      unitId: unit.id.toString(),
      address: unit.property.address,
      city: unit.property.city,
      state: unit.property.state,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      rent: 1500, // TODO: Get from lease or pricing model
      available: true,
      amenities: this.getUnitAmenities(unit, unit.property),
      matchScore: 0.9, // TODO: Implement matching algorithm
      images: [], // TODO: Add unit images
    }));
  }

  /**
   * Record property inquiry
   */
  async recordPropertyInquiry(
    leadId: string,
    propertyId: number,
    unitId?: number,
    interest: InterestLevel = InterestLevel.MEDIUM,
  ): Promise<PropertyInquiry> {
    return this.prisma.propertyInquiry.create({
      data: {
        leadId,
        propertyId,
        unitId: unitId || null,
        interest,
      },
    });
  }

  /**
   * Update lead status
   */
  async updateLeadStatus(leadId: string, status: LeadStatus): Promise<Lead> {
    const updates: any = { status };

    if (status === LeadStatus.CONVERTED) {
      updates.convertedAt = new Date();
    }

    return this.prisma.lead.update({
      where: { id: leadId },
      data: updates,
    });
  }

  /**
   * Get lead statistics
   */
  async getLeadStatistics(dateFrom?: Date, dateTo?: Date) {
    const where: Prisma.LeadWhereInput = {};

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = dateFrom;
      if (dateTo) where.createdAt.lte = dateTo;
    }

    const [
      totalLeads,
      newLeads,
      qualifiedLeads,
      touringLeads,
      convertedLeads,
      lostLeads,
    ] = await Promise.all([
      this.prisma.lead.count({ where }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.NEW } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.QUALIFIED } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.TOURING } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.CONVERTED } }),
      this.prisma.lead.count({ where: { ...where, status: LeadStatus.LOST } }),
    ]);

    return {
      totalLeads,
      newLeads,
      qualifiedLeads,
      touringLeads,
      convertedLeads,
      lostLeads,
      conversionRate: totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0,
    };
  }

  /**
   * Helper to get unit amenities
   */
  private getUnitAmenities(unit: any, property: any): string[] {
    const amenities: string[] = [];

    if (unit.hasParking || property.hasParking) amenities.push('Parking');
    if (unit.hasLaundry) amenities.push('In-unit laundry');
    if (unit.hasBalcony) amenities.push('Balcony');
    if (unit.hasAC) amenities.push('Air Conditioning');
    if (unit.isFurnished) amenities.push('Furnished');
    if (unit.petsAllowed) amenities.push('Pet-friendly');
    if (property.hasPool) amenities.push('Pool');
    if (property.hasGym) amenities.push('Gym');
    if (property.hasElevator) amenities.push('Elevator');

    return amenities;
  }
}
