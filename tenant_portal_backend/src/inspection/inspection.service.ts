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

@Injectable()
export class InspectionService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Create a new inspection
   */
  async createInspection(dto: CreateInspectionDto, createdById: number): Promise<UnitInspection> {
    // Validate property and unit exist
    const property = await this.prisma.property.findUnique({
      where: { id: dto.propertyId },
    });
    if (!property) {
      throw new NotFoundException(`Property with ID ${dto.propertyId} not found`);
    }

    if (dto.unitId) {
      const unit = await this.prisma.unit.findUnique({
        where: { id: dto.unitId },
      });
      if (!unit || unit.propertyId !== dto.propertyId) {
        throw new NotFoundException(`Unit with ID ${dto.unitId} not found in property ${dto.propertyId}`);
      }
    }

    // Validate lease exists if provided
    if (dto.leaseId) {
      const lease = await this.prisma.lease.findUnique({
        where: { id: dto.leaseId },
      });
      if (!lease || (dto.unitId && lease.unitId !== dto.unitId)) {
        throw new NotFoundException(`Lease with ID ${dto.leaseId} not found or doesn't match unit`);
      }
    }

    const inspectionData: any = {
      propertyId: dto.propertyId,
      type: dto.type,
      scheduledDate: new Date(dto.scheduledDate),
      createdById,
      status: 'SCHEDULED',
    };

    // Only include optional fields if they have values
    if (dto.unitId) inspectionData.unitId = dto.unitId;
    if (dto.leaseId) inspectionData.leaseId = dto.leaseId;
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
    createdById: number
  ): Promise<UnitInspection> {
    const inspection = await this.createInspection(dto.inspection, createdById);

    // Create rooms - either custom or default based on property type
    if (dto.rooms && dto.rooms.length > 0) {
      // Create custom rooms
      for (const roomDto of dto.rooms) {
        await this.createRoomWithDefaultChecklist(inspection.id, roomDto);
      }
    } else {
      // Create default rooms based on property type
      const propertyType = dto.propertyType || 'apartment';
      await createDefaultInspectionRooms(inspection.id, propertyType);
    }

    return this.getInspectionById(inspection.id);
  }

  /**
   * Get inspection by ID with full details
   */
  async getInspectionById(id: number): Promise<UnitInspection> {
    const inspection = await this.prisma.unitInspection.findUnique({
      where: { id },
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

    return inspection;
  }

  /**
   * Get inspections with filtering and pagination
   */
  async getInspections(query: InspectionQueryDto): Promise<{
    inspections: UnitInspection[];
    total: number;
  }> {
    const where = {
      ...(query.propertyId && { propertyId: query.propertyId }),
      ...(query.unitId && { unitId: query.unitId }),
      ...(query.leaseId && { leaseId: query.leaseId }),
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
      ...(query.inspectorId && { inspectorId: query.inspectorId }),
      ...(query.tenantId && { tenantId: query.tenantId }),
    };

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
        orderBy: { scheduledDate: 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      this.prisma.unitInspection.count({ where }),
    ]);

    return { inspections, total };
  }

  /**
   * Update inspection
   */
  async updateInspection(id: number, dto: UpdateInspectionDto): Promise<UnitInspection> {
    const existingInspection = await this.getInspectionById(id);

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
    dto: CreateRoomDto
  ): Promise<InspectionRoom> {
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
        checklistItems: {
          include: {
            photos: true,
            subItems: true,
          },
        },
      },
    });

    return room;
  }

  /**
   * Update checklist item
   */
  async updateChecklistItem(
    itemId: number, 
    dto: UpdateChecklistItemDto
  ): Promise<InspectionChecklistItem> {
    const item = await this.prisma.inspectionChecklistItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Checklist item with ID ${itemId} not found`);
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
   * Add photo to checklist item
   */
  async addPhotoToChecklistItem(
    itemId: number, 
    dto: UploadPhotoDto, 
    uploadedById: number
  ): Promise<any> {
    const item = await this.prisma.inspectionChecklistItem.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      throw new NotFoundException(`Checklist item with ID ${itemId} not found`);
    }

    return this.prisma.inspectionChecklistPhoto.create({
      data: {
        checklistItemId: itemId,
        url: dto.url,
        caption: dto.caption,
        uploadedById,
      },
      include: {
        uploadedBy: true,
      },
    });
  }

  /**
   * Add signature to inspection
   */
  async addSignature(inspectionId: number, dto: CreateSignatureDto): Promise<any> {
    const inspection = await this.prisma.unitInspection.findUnique({
      where: { id: inspectionId },
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
  async completeInspection(id: number): Promise<UnitInspection> {
    const inspection = await this.getInspectionById(id);

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
   * Get inspection statistics
   */
  async getInspectionStats(propertyId?: number): Promise<any> {
    const where = propertyId ? { propertyId } : {};

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
  async deleteInspection(id: number): Promise<void> {
    const inspection = await this.prisma.unitInspection.findUnique({
      where: { id },
    });

    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${id} not found`);
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
      if (inspection.inspector?.email) {
        await this.emailService.sendNotificationEmail(
          inspection.inspector.email,
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
      if (inspection.tenant?.email) {
        await this.emailService.sendNotificationEmail(
          inspection.tenant.email,
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
      const recipients = [
        inspection.inspector?.email,
        inspection.tenant?.email,
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
}