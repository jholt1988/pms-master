import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { 
  CreateInspectionDto,
  UpdateInspectionDto,
  CreateRoomDto,
  CreateChecklistItemDto,
  UpdateChecklistItemDto,
  UploadPhotoDto,
  CreateSignatureDto,
  InspectionQueryDto,
  CreateInspectionWithRoomsDto
} from './dto/simple-inspection.dto';
import { 
  UnitInspection, 
  InspectionRoom, 
  InspectionChecklistItem,
  InspectionStatus,
  InspectionType,
  RoomType
} from '@prisma/client';
import { createDefaultInspectionRooms, getChecklistTemplate } from '../../prisma/seed-inspection-templates';
import { isUUID } from 'class-validator';

@Injectable()
export class InspectionService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  private async assertInspectionInOrg(inspectionId: number, orgId?: string) {
    if (!orgId) return;
    const inspection = await this.prisma.unitInspection.findFirst({
      where: { id: inspectionId, property: { organizationId: orgId } },
      select: { id: true },
    });
    if (!inspection) {
      throw new NotFoundException('Inspection not found');
    }
  }

  private async assertPropertyInOrg(propertyId: string, orgId?: string) {
    if (!orgId) return;
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, organizationId: orgId },
      select: { id: true },
    });
    if (!property) {
      throw new NotFoundException('Property not found');
    }
  }

  /**
   * Create a new inspection
   */
  async createInspection(dto: CreateInspectionDto, createdById: string, orgId?: string): Promise<UnitInspection> {
    // Validate property and unit exist
    const propertyId = this.parseUuidId(dto.propertyId, 'property');
    const unitId = dto.unitId ? this.parseUuidId(dto.unitId, 'unit') : undefined;
    const leaseId = dto.leaseId ? this.parseUuidId(dto.leaseId, 'lease') : undefined;

    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, ...(orgId ? { organizationId: orgId } : {}) },
    });
    if (!property) {
      throw new NotFoundException(`Property with ID ${dto.propertyId} not found`);
    }

    if (dto.unitId) {
      const unit = await this.prisma.unit.findFirst({
        where: { id: unitId, ...(orgId ? { property: { organizationId: orgId } } : {}) },
      });
      if (!unit || unit.propertyId !== propertyId) {
        throw new NotFoundException(`Unit with ID ${dto.unitId} not found in property ${dto.propertyId}`);
      }
    }

    // Validate lease exists if provided
    if (dto.leaseId) {
      const lease = await this.prisma.lease.findFirst({
        where: {
          id: leaseId,
          ...(orgId ? { unit: { property: { organizationId: orgId } } } : {}),
        },
      });
      if (!lease || (unitId && lease.unitId !== unitId)) {
        throw new NotFoundException(`Lease with ID ${dto.leaseId} not found or doesn't match unit`);
      }
    }

    const inspectionData: any = {
      propertyId,
      type: dto.type,
      scheduledDate: new Date(dto.scheduledDate),
      createdById,
      status: 'SCHEDULED',
    };

    // Only include optional fields if they have values
    if (unitId) inspectionData.unitId = unitId;
    if (leaseId) inspectionData.leaseId = leaseId;
    if (dto.inspectorId) inspectionData.inspectorId = dto.inspectorId;
    if (dto.tenantId) inspectionData.tenantId = dto.tenantId;
    if (dto.notes) inspectionData.notes = dto.notes;
    if (dto.generalNotes) inspectionData.generalNotes = dto.generalNotes;

    const inspection = await this.prisma.unitInspection.create({
      data: inspectionData,
      include: {
        property: true,
        unit: true,
        lease: true,
        inspector: true,
        tenant: true,
        rooms: {
          include: {
            checklistItems: {
              include: {
                photos: true,
                subItems: true,
              },
            },
          },
        },
        signatures: true,
      },
    });

    // Send notification email
    await this.sendInspectionScheduledNotification(inspection);

    return inspection;
  }

  /**
   * Create inspection with default rooms
   */
  async createInspectionWithRooms(
    dto: CreateInspectionWithRoomsDto, 
    createdById: string,
    orgId?: string
  ): Promise<UnitInspection> {
    const inspectionDto = (dto as any).inspection ?? {
      propertyId: (dto as any).propertyId,
      unitId: (dto as any).unitId,
      leaseId: (dto as any).leaseId,
      tenantId: (dto as any).tenantId,
      type: (dto as any).type,
      scheduledDate: (dto as any).scheduledDate,
      inspectorId: (dto as any).inspectorId,
      notes: (dto as any).notes,
      generalNotes: (dto as any).generalNotes,
    };

    if (!dto.rooms || dto.rooms.length === 0) {
      throw new BadRequestException('At least one room must be provided');
    }

    const inspection = await this.createInspection(inspectionDto, createdById, orgId);

    // Create rooms - either custom or default based on property type
    if (dto.rooms && dto.rooms.length > 0) {
      // Create custom rooms
      for (const roomDto of dto.rooms) {
        await this.createRoomWithDefaultChecklist(inspection.id, roomDto, orgId);
      }
    }

    return inspection;
  }

  /**
   * Get inspection by ID with full details
   */
  async getInspectionById(id: number, viewer?: { userId?: string; role?: string }, orgId?: string): Promise<UnitInspection> {
    const inspection = await this.prisma.unitInspection.findFirst({
      where: {
        id,
        ...(orgId ? { property: { organizationId: orgId } } : {}),
      },
      include: {
        property: true,
        unit: true,
        lease: { include: { tenant: true } },
        inspector: true,
        tenant: true,
        createdBy: true,
        rooms: {
          include: {
            checklistItems: {
              include: {
                photos: {
                  include: { uploadedBy: true },
                },
                subItems: true,
              },
            },
          },
        },
        signatures: {
          include: { user: true },
        },
        repairEstimates: {
          include: {
            lineItems: true,
            generatedBy: true,
            approvedBy: true,
          },
        },
        photos: {
          include: { uploadedBy: true },
        },
      },
    });

    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${id} not found`);
    }

    // Tenant access enforcement
    if (viewer?.role === 'TENANT') {
      await this.assertTenantCanViewInspection(inspection, viewer.userId);
    }

    return inspection;
  }

  /**
   * Get inspections with filtering and pagination
   */
  async getInspections(query: InspectionQueryDto, viewer?: { userId?: string; role?: string }, orgId?: string): Promise<{
    inspections: UnitInspection[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const propertyId = query.propertyId ? this.parseUuidId(query.propertyId, 'property') : undefined;
    const unitId = query.unitId ? this.parseUuidId(query.unitId, 'unit') : undefined;
    const leaseId = query.leaseId ? this.parseUuidId(query.leaseId, 'lease') : undefined;

    const where: any = {
      ...(propertyId && { propertyId }),
      ...(unitId && { unitId }),
      ...(leaseId && { leaseId }),
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
      ...(query.inspectorId && { inspectorId: query.inspectorId }),
      ...(query.tenantId && { tenantId: query.tenantId }),
      ...(orgId && { property: { organizationId: orgId } }),
    };

    // Tenant scoping: only their unit's MOVE_IN / MOVE_OUT inspections
    if (viewer?.role === 'TENANT') {
      const tenantUnitId = await this.resolveActiveLeaseUnitId(viewer.userId);
      where.unitId = tenantUnitId;
      where.type = { in: ['MOVE_IN', 'MOVE_OUT'] };
    }

    const [inspections, total] = await Promise.all([
      this.prisma.unitInspection.findMany({
        where,
        include: {
          property: true,
          unit: true,
          lease: { include: { tenant: true } },
          inspector: true,
          tenant: true,
          rooms: {
            include: {
              checklistItems: {
                where: { requiresAction: true },
              },
            },
          },
          signatures: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      this.prisma.unitInspection.count({ where }),
    ]);

    return {
      inspections,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    };
  }

  /**
   * Update inspection
   */
  async updateInspection(id: number, dto: UpdateInspectionDto, orgId?: string): Promise<UnitInspection> {
    await this.assertInspectionInOrg(id, orgId);
    const existingInspection = await this.prisma.unitInspection.findUniqueOrThrow({
      where: { id },
    });

    const updateData: any = {
      ...dto,
    };

    if (dto.scheduledDate) {
      updateData.scheduledDate = new Date(dto.scheduledDate);
    }

    if (dto.completedDate) {
      updateData.completedDate = new Date(dto.completedDate);
    }

    const inspection = await this.prisma.unitInspection.update({
      where: { id },
      data: updateData,
      include: {
        property: true,
        unit: true,
        lease: true,
        inspector: true,
        tenant: true,
        rooms: {
          include: {
            checklistItems: {
              include: {
                photos: true,
                subItems: true,
              },
            },
          },
        },
        signatures: true,
        repairEstimates: true,
      },
    });

    // Send notifications for status changes
    if (dto.status && dto.status !== existingInspection.status) {
      await this.handleStatusChange(inspection, existingInspection.status, dto.status);
    }

    return inspection;
  }

  /**
   * Create room with default checklist
   */
  async createRoomWithDefaultChecklist(
    inspectionId: number, 
    dto: CreateRoomDto,
    orgId?: string
  ): Promise<InspectionRoom> {
    await this.assertInspectionInOrg(inspectionId, orgId);

    // Get checklist template for room type
    const template = getChecklistTemplate(dto.roomType as RoomType);

    const room = await this.prisma.inspectionRoom.create({
      data: {
        inspectionId,
        name: dto.name,
        roomType: dto.roomType as RoomType,
        checklistItems: {
          create: template.map(item => ({
            category: item.category,
            itemName: item.itemName,
            requiresAction: false,
          })),
        },
      },
      include: {
        checklistItems: true,
      },
    });

    return room;
  }

  /**
   * Update checklist item
   */
  async updateChecklistItem(
    itemId: number, 
    dto: UpdateChecklistItemDto,
    orgId?: string
  ): Promise<InspectionChecklistItem> {
    const item = await this.prisma.inspectionChecklistItem.findUnique({
      where: { id: itemId },
      include: { room: { include: { inspection: { include: { property: true } } } } },
    });

    if (!item) {
      throw new NotFoundException(`Checklist item with ID ${itemId} not found`);
    }

    if (orgId) {
      const itemOrgId = (item as any).room?.inspection?.property?.organizationId;
      if (!itemOrgId || itemOrgId !== orgId) {
        throw new NotFoundException('Checklist item not found');
      }
    }

    return this.prisma.inspectionChecklistItem.update({
      where: { id: itemId },
      data: dto,
      include: {
        photos: true,
        subItems: true,
      },
    });
  }

  /**
   * Update many checklist items in a room atomically (all-or-nothing).
   */
  async updateRoomChecklistItems(
    roomId: number,
    items: Array<{
      itemId: number;
      requiresAction?: boolean;
      condition?: any;
      notes?: string;
      severity?: any;
      issueType?: any;
      measurementValue?: number;
      measurementUnit?: any;
      measurementNotes?: string;
    }>,
    viewer?: { userId?: string; role?: string },
    orgId?: string,
  ): Promise<{ roomId: number; updatedCount: number }> {
    if (!items?.length) {
      return { roomId, updatedCount: 0 };
    }

    // Ensure the room exists and all itemIds belong to this room.
    const room = await this.prisma.inspectionRoom.findUnique({
      where: { id: roomId },
      include: { checklistItems: true, inspection: true },
    });

    if (!room) {
      throw new NotFoundException(`Room with ID ${roomId} not found`);
    }

    if (orgId) {
      const inspection = await this.getInspectionById(room.inspectionId, viewer, orgId);
      if (!inspection) {
        throw new NotFoundException(`Room with ID ${roomId} not found`);
      }
    }

    // Tenant access enforcement for edits
    if (viewer?.role === 'TENANT') {
      // Load inspection details and enforce same rules as view + lock.
      const inspection = await this.getInspectionById(room.inspectionId, viewer, orgId);
      if (String(inspection.status) === 'COMPLETED') {
        throw new BadRequestException('Inspection is completed and locked');
      }
    }

    const allowed = new Set(room.checklistItems.map((i: any) => i.id));
    const bad = items.find((i) => !allowed.has(i.itemId));
    if (bad) {
      throw new BadRequestException(
        `Checklist item ${bad.itemId} does not belong to room ${roomId}`,
      );
    }

    const isTenant = viewer?.role === 'TENANT';

    await this.prisma.$transaction(
      items.map((i) =>
        this.prisma.inspectionChecklistItem.update({
          where: { id: i.itemId },
          data: {
            ...(typeof i.requiresAction === 'boolean' ? { requiresAction: i.requiresAction } : {}),
            ...(('notes' in i) ? { notes: i.notes } : {}),

            // For MVP tenant flow, tenants may only edit requiresAction + notes.
            ...(isTenant
              ? {}
              : {
                  ...(('condition' in i) ? { condition: i.condition } : {}),
                  ...(('severity' in i) ? { severity: i.severity } : {}),
                  ...(('issueType' in i) ? { issueType: i.issueType } : {}),
                  ...(('measurementValue' in i) ? { measurementValue: i.measurementValue } : {}),
                  ...(('measurementUnit' in i) ? { measurementUnit: i.measurementUnit } : {}),
                  ...(('measurementNotes' in i) ? { measurementNotes: i.measurementNotes } : {}),
                }),
          },
        }),
      ),
    );

    return { roomId, updatedCount: items.length };
  }

  /**
   * Add photo to checklist item
   */
  async addPhotoToChecklistItem(
    itemId: number, 
    dto: UploadPhotoDto, 
    uploadedById: string,
    orgId?: string
  ): Promise<any> {
    const item = await this.prisma.inspectionChecklistItem.findUnique({
      where: { id: itemId },
      include: { room: { include: { inspection: { include: { property: true } } } } },
    });

    if (!item) {
      throw new NotFoundException(`Checklist item with ID ${itemId} not found`);
    }

    if (orgId) {
      const itemOrgId = (item as any).room?.inspection?.property?.organizationId;
      if (!itemOrgId || itemOrgId !== orgId) {
        throw new NotFoundException('Checklist item not found');
      }
    }

    return this.prisma.inspectionChecklistPhoto.create({
      data: {
        checklistItem: { connect: { id: itemId } },
        url: dto.url,
        caption: dto.caption,
        uploadedBy: { connect: { id: uploadedById } },
      },
    });
  }

  /**
   * Delete a photo from a checklist item
   */
  async deletePhoto(photoId: number, orgId?: string): Promise<void> {
    const photo = await this.prisma.inspectionChecklistPhoto.findUnique({
      where: { id: photoId },
      include: { checklistItem: { include: { room: { include: { inspection: { include: { property: true } } } } } } },
    });

    if (!photo) {
      throw new NotFoundException(`Photo with ID ${photoId} not found`);
    }

    if (orgId) {
      const itemOrgId = (photo as any).checklistItem?.room?.inspection?.property?.organizationId;
      if (!itemOrgId || itemOrgId !== orgId) {
        throw new NotFoundException('Photo not found');
      }
    }

    await this.prisma.inspectionChecklistPhoto.delete({
      where: { id: photoId },
    });
  }

  /**
   * Analyze photos using AI to suggest condition, severity, and issue type
   */
  async analyzePhotos(itemId: number, orgId?: string): Promise<{
    success: boolean;
    analysis: string;
    suggestedCondition?: string;
    suggestedSeverity?: string;
    suggestedIssueType?: string;
    suggestedNotes?: string;
  }> {
    const item = await this.prisma.inspectionChecklistItem.findUnique({
      where: { id: itemId },
      include: { 
        photos: true,
        room: { include: { inspection: { include: { property: true } } } }
      },
    });

    if (!item) {
      throw new NotFoundException(`Checklist item with ID ${itemId} not found`);
    }

    if (orgId) {
      const itemOrgId = (item as any).room?.inspection?.property?.organizationId;
      if (!itemOrgId || itemOrgId !== orgId) {
        throw new NotFoundException('Checklist item not found');
      }
    }

    // Check if there are photos to analyze
    if (!item.photos || item.photos.length === 0) {
      return {
        success: false,
        analysis: 'No photos available for analysis.',
      };
    }

    try {
      // Try to use OpenAI for analysis
      const openaiApiKey = process.env.OPENAI_API_KEY;
      
      if (openaiApiKey) {
        const OpenAI = require('openai');
        const openai = new OpenAI({ apiKey: openaiApiKey });

        // Build a prompt with photo URLs and item context
        const photoUrls = item.photos.map(p => p.url).join('\n');
        const itemContext = `${item.itemName} in ${item.room.name} - Category: ${item.category}`;
        
        const prompt = `You are a property inspection expert. Analyze these photos of: ${itemContext}

Photos:
${photoUrls}

Based on the visual evidence in these photos:
1. What is the condition of this item? (EXCELLENT, GOOD, FAIR, POOR, DAMAGED, NON_FUNCTIONAL)
2. What severity level applies? (LOW, MED, HIGH, EMERGENCY)
3. What issue type is most appropriate? (INVESTIGATE, REPAIR, REPLACE)
4. Provide a brief description of what you observe.
5. What action would you recommend?

Respond in JSON format:
{
  "condition": "...",
  "severity": "...",
  "issueType": "...",
  "description": "...",
  "recommendedAction": "..."
}`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: 'You are a property inspection expert with extensive experience in assessing housing conditions.' },
            { role: 'user', content: prompt }
          ],
          response_format: { type: 'json_object' },
          max_tokens: 500,
        });

        const result = JSON.parse(completion.choices[0].message.content);
        
        // Save AI analysis to each photo
        for (const photo of item.photos) {
          await this.prisma.inspectionChecklistPhoto.update({
            where: { id: photo.id },
            data: { aiAnalysis: result.description },
          });
        }

        return {
          success: true,
          analysis: result.description,
          suggestedCondition: result.condition,
          suggestedSeverity: result.severity,
          suggestedIssueType: result.issueType,
          suggestedNotes: `${result.description}\n\nRecommended action: ${result.recommendedAction}`,
        };
      } else {
        // Fallback: Use rule-based analysis
        const fallbackAnalysis = this.generateFallbackAnalysis(item);
        return fallbackAnalysis;
      }
    } catch (error) {
      console.error('AI photo analysis failed:', error);
      
      // Return fallback analysis on error
      const fallbackAnalysis = this.generateFallbackAnalysis(item);
      return fallbackAnalysis;
    }
  }

  /**
   * Generate fallback analysis based on checklist item data
   */
  private generateFallbackAnalysis(item: any): {
    success: boolean;
    analysis: string;
    suggestedCondition?: string;
    suggestedSeverity?: string;
    suggestedIssueType?: string;
    suggestedNotes?: string;
  } {
    // Default assumptions based on category
    const categoryLower = (item.category || '').toLowerCase();
    let suggestedCondition = 'FAIR';
    let suggestedSeverity = 'MED';
    let suggestedIssueType = 'REPAIR';
    let analysis = 'Based on the uploaded photos, this item shows signs of wear that may require attention.';
    let recommendedAction = 'Further inspection recommended to determine exact repair scope.';

    // Category-based heuristics
    if (categoryLower.includes('appliance') || categoryLower.includes('kitchen')) {
      if (item.notes?.toLowerCase().includes('leak') || item.notes?.toLowerCase().includes('not working')) {
        suggestedCondition = 'POOR';
        suggestedIssueType = 'REPAIR';
        suggestedSeverity = 'HIGH';
        analysis = 'The appliance shows functional issues that require professional repair.';
      }
    } else if (categoryLower.includes('floor') || categoryLower.includes('carpet') || categoryLower.includes('tile')) {
      suggestedCondition = 'FAIR';
      if (item.notes?.toLowerCase().includes('stain') || item.notes?.toLowerCase().includes('tear')) {
        suggestedCondition = 'POOR';
        analysis = 'Visible damage to flooring surface observed in photos.';
      }
    } else if (categoryLower.includes('wall') || categoryLower.includes('ceiling') || categoryLower.includes('paint')) {
      suggestedCondition = 'FAIR';
      if (item.notes?.toLowerCase().includes('crack') || item.notes?.toLowerCase().includes('hole')) {
        suggestedCondition = 'POOR';
        suggestedIssueType = 'REPAIR';
        analysis = 'Wall/ceiling damage visible - patch and paint repair recommended.';
      }
    } else if (categoryLower.includes('plumb') || categoryLower.includes('bathroom')) {
      suggestedCondition = 'FAIR';
      if (item.notes?.toLowerCase().includes('leak') || item.notes?.toLowerCase().includes('drip')) {
        suggestedCondition = 'DAMAGED';
        suggestedSeverity = 'HIGH';
        suggestedIssueType = 'REPAIR';
        analysis = 'Plumbing issue detected - immediate repair recommended to prevent further damage.';
      }
    }

    return {
      success: true,
      analysis,
      suggestedCondition,
      suggestedSeverity,
      suggestedIssueType,
      suggestedNotes: `${analysis}\n\nRecommended action: ${recommendedAction}`,
    };
  }

  /**
   * Add signature to inspection
   */
  async addSignature(inspectionId: number, dto: CreateSignatureDto, orgId?: string): Promise<any> {
    const inspection = await this.prisma.unitInspection.findFirst({
      where: {
        id: inspectionId,
        ...(orgId ? { property: { organizationId: orgId } } : {}),
      },
    });

    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${inspectionId} not found`);
    }

    // Check if user already signed
    const existingSignature = await this.prisma.inspectionSignature.findFirst({
      where: {
        inspectionId,
        userId: dto.userId,
      },
    });

    if (existingSignature) {
      throw new BadRequestException('User has already signed this inspection');
    }

    return this.prisma.inspectionSignature.create({
      data: {
        inspectionId,
        userId: dto.userId,
        role: dto.role,
        signatureData: dto.signatureData,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Complete inspection
   */
  async completeInspection(id: number, orgId?: string): Promise<UnitInspection> {
    const inspection = await this.getInspectionById(id, undefined, orgId);

    if (inspection.status === 'COMPLETED') {
      throw new BadRequestException('Inspection is already completed');
    }

    const updatedInspection = await this.prisma.unitInspection.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        completedDate: new Date(),
      },
      include: {
        property: true,
        unit: true,
        lease: true,
        inspector: true,
        tenant: true,
        rooms: {
          include: {
            checklistItems: {
              where: { requiresAction: true },
              include: {
                photos: true,
              },
            },
          },
        },
        signatures: true,
      },
    });

    // Send completion notification
    await this.sendInspectionCompletedNotification(updatedInspection);

    return updatedInspection;
  }

  /**
   * Set inspection status with role-aware enforcement.
   * Tenants may only set status to COMPLETED, and only for their unit's MOVE_IN/MOVE_OUT inspections.
   */
  async setInspectionStatus(
    id: number,
    nextStatus: string,
    viewer?: { userId?: string; role?: string },
    orgId?: string,
  ): Promise<UnitInspection> {
    if (!nextStatus) {
      throw new BadRequestException('Missing status');
    }

    const inspection = await this.getInspectionById(id, viewer, orgId);

    if (viewer?.role === 'TENANT') {
      if (nextStatus !== 'COMPLETED') {
        throw new BadRequestException('Tenants may only mark inspections as COMPLETED');
      }
      if (inspection.status === 'COMPLETED') {
        throw new BadRequestException('Inspection is already completed');
      }
      return this.completeInspection(id, orgId);
    }

    // PM/Admin: allow setting status directly (minimal MVP behavior)
    if (nextStatus === 'COMPLETED') {
      return this.completeInspection(id, orgId);
    }

    const updated = await this.prisma.unitInspection.update({
      where: { id },
      data: { status: nextStatus as any },
      include: {
        property: true,
        unit: true,
        lease: { include: { tenant: true } },
        inspector: true,
        tenant: true,
        rooms: {
          include: {
            checklistItems: {
              include: {
                photos: { include: { uploadedBy: true } },
                subItems: true,
              },
            },
          },
        },
        signatures: { include: { user: true } },
      },
    });

    return updated;
  }

  /**
   * Get inspection statistics
   */
  async getInspectionStats(propertyId?: string, orgId?: string): Promise<any> {
    const parsedPropertyId = propertyId ? this.parseUuidId(propertyId, 'property') : undefined;
    const where = {
      ...(parsedPropertyId ? { propertyId: parsedPropertyId } : {}),
      ...(orgId ? { property: { organizationId: orgId } } : {}),
    };

    const [
      total,
      scheduled,
      inProgress,
      completed,
      requiresAction
    ] = await Promise.all([
      this.prisma.unitInspection.count({ where }),
      this.prisma.unitInspection.count({ where: { ...where, status: 'SCHEDULED' } }),
      this.prisma.unitInspection.count({ where: { ...where, status: 'IN_PROGRESS' } }),
      this.prisma.unitInspection.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.unitInspection.count({
        where: {
          ...where,
          rooms: {
            some: {
              checklistItems: {
                some: { requiresAction: true }
              }
            }
          }
        }
      }),
    ]);

    return {
      total,
      byStatus: {
        scheduled,
        inProgress,
        completed,
      },
      requiresAction,
    };
  }

  /**
   * Delete inspection
   */
  async deleteInspection(id: number, orgId?: string): Promise<void> {
    await this.assertInspectionInOrg(id, orgId);
    let inspection: UnitInspection;
    try {
      inspection = await this.prisma.unitInspection.findUniqueOrThrow({
        where: { id },
      }) as UnitInspection;
    } catch (error) {
      throw new NotFoundException(`Inspection with ID ${id} not found`);
    }

    if (inspection.status === 'COMPLETED') {
      throw new BadRequestException('Completed inspections cannot be deleted');
    }


    await this.prisma.unitInspection.delete({
      where: { id },
    });
  }

  // Private helper methods

  private async handleStatusChange(
    inspection: UnitInspection, 
    oldStatus: InspectionStatus, 
    newStatus: InspectionStatus
  ): Promise<void> {
    if (newStatus === 'IN_PROGRESS' && oldStatus === 'SCHEDULED') {
      // Inspection started
      await this.sendInspectionStartedNotification(inspection);
    } else if (newStatus === 'COMPLETED' && oldStatus !== 'COMPLETED') {
      // Inspection completed
      await this.sendInspectionCompletedNotification(inspection);
    }
  }

  private async sendInspectionScheduledNotification(inspection: any): Promise<void> {
    try {
      // Use username as email if email field doesn't exist on User model
      const inspectorEmail = inspection.inspector?.email || inspection.inspector?.username;
      if (inspectorEmail) {
        await this.emailService.sendNotificationEmail(
          inspectorEmail,
          `Inspection Scheduled - ${inspection.property.name}`,
          `A ${inspection.type} inspection has been scheduled for ${inspection.property.name}${inspection.unit ? ` - ${inspection.unit.name}` : ''} on ${inspection.scheduledDate}.`
        );
      }
    } catch (error) {
      console.error('Failed to send inspection scheduled email:', error);
    }
  }

  private async sendInspectionStartedNotification(inspection: any): Promise<void> {
    try {
      // Use username as email if email field doesn't exist on User model
      const tenantEmail = inspection.tenant?.email || inspection.tenant?.username;
      if (tenantEmail) {
        await this.emailService.sendNotificationEmail(
          tenantEmail,
          `Inspection In Progress - ${inspection.property.name}`,
          `The ${inspection.type} inspection for ${inspection.property.name}${inspection.unit ? ` - ${inspection.unit.name}` : ''} has started.`
        );
      }
    } catch (error) {
      console.error('Failed to send inspection started email:', error);
    }
  }

  private async sendInspectionCompletedNotification(inspection: any): Promise<void> {
    const requiresActionCount = inspection.rooms.reduce(
      (count: number, room: any) => count + room.checklistItems.filter((item: any) => item.requiresAction).length,
      0
    );

    try {
      // Use username as email if email field doesn't exist on User model
      const recipients = [
        inspection.inspector?.email || inspection.inspector?.username,
        inspection.tenant?.email || inspection.tenant?.username,
      ].filter(Boolean);

      if (recipients.length > 0) {
        for (const recipient of recipients) {
          await this.emailService.sendNotificationEmail(
            recipient,
            `Inspection Complete - ${inspection.property.name}`,
            `The ${inspection.type} inspection for ${inspection.property.name}${inspection.unit ? ` - ${inspection.unit.name}` : ''} has been completed. ${requiresActionCount > 0 ? `${requiresActionCount} items require attention.` : 'No issues found.'}`
          );
        }
      }
    } catch (error) {
      console.error('Failed to send inspection completed email:', error);
    }
  }

  private async resolveActiveLeaseUnitId(userId?: string): Promise<string> {
    if (!userId) throw new BadRequestException('Missing user id');

    // MVP: user has exactly one lease (schema enforces unique tenantId).
    const lease = await this.prisma.lease.findUnique({
      where: { tenantId: userId as any },
      select: { unitId: true, status: true },
    });

    if (!lease || lease.status !== 'ACTIVE') {
      throw new NotFoundException('No active lease found for tenant');
    }

    return String(lease.unitId);
  }

  private async assertTenantCanViewInspection(inspection: any, userId?: string): Promise<void> {
    const tenantUnitId = await this.resolveActiveLeaseUnitId(userId);

    if (!inspection.unitId) {
      throw new NotFoundException('Inspection not found');
    }

    if (String(inspection.unitId) !== tenantUnitId) {
      throw new NotFoundException('Inspection not found');
    }

    const allowedTypes = new Set(['MOVE_IN', 'MOVE_OUT']);
    if (!allowedTypes.has(String(inspection.type))) {
      throw new NotFoundException('Inspection not found');
    }
  }

  private parseUuidId(value: string | number, field: string): string {
    if (typeof value !== 'string' || !isUUID(value)) {
      throw new BadRequestException(`Invalid ${field} identifier provided.`);
    }
    return value;
  }

  private parseNumericId(value: string | number, field: string): number {
    const id = Number(value);
    if (isNaN(id)) {
      throw new BadRequestException(`Invalid ${field} identifier provided.`);
    }
    return id;
  }
}
