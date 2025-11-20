import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { 
  CreateEstimateDto,
  UpdateEstimateDto,
  EstimateQueryDto 
} from './dto/simple-inspection.dto';
import { 
  RepairEstimate, 
  EstimateStatus,
  InspectionCondition,
  MaintenanceRequest,
  UnitInspection,
  MaintenancePriority
} from '@prisma/client';
import { 
  createEnhancedEstimateAgent, 
  EnhancedEstimateAgent 
} from './agents/enhanced-estimate-agent';
import { 
  UserLocation, 
  InventoryItem, 
  EstimateResult 
} from './agents/estimate-tools';

@Injectable()
export class EstimateService {
  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  /**
   * Generate AI-powered repair estimate from inspection data
   */
  async generateEstimateFromInspection(
    inspectionId: number, 
    userId: number
  ): Promise<RepairEstimate> {
    const inspection = await this.prisma.unitInspection.findUniqueOrThrow({
      where: { id: inspectionId },
      include: {
        property: true,
        unit: true,
        rooms: {
          include: {
            checklistItems: {
              where: { requiresAction: true },
              include: { 
                subItems: true,
                photos: true,
              },
            },
          },
        },
      },
    });

    if (!inspection) {
      throw new NotFoundException(`Inspection with ID ${inspectionId} not found`);
    }

    // Convert inspection items to inventory format for AI agent
    const inventoryItems = this.convertInspectionToInventoryItems(inspection);

    if (inventoryItems.length === 0) {
      throw new BadRequestException('No items requiring action found in inspection');
    }

    // Get user location from property address
    const userLocation = await this.getLocationFromProperty(inspection.property);

    // Call AI agent for estimate generation
    const agent = createEnhancedEstimateAgent(userLocation);
    const estimateResult = await agent.generateEstimate(inventoryItems);

    // Save estimate to database
    const estimate = await this.prisma.repairEstimate.create({
      data: {
        inspectionId,
        propertyId: inspection.propertyId,
        unitId: inspection.unitId,
        totalLaborCost: estimateResult.estimate_summary.total_labor_cost,
        totalMaterialCost: estimateResult.estimate_summary.total_material_cost,
        totalProjectCost: estimateResult.estimate_summary.total_project_cost,
        itemsToRepair: estimateResult.estimate_summary.items_to_repair,
        itemsToReplace: estimateResult.estimate_summary.items_to_replace,
        generatedById: userId,
        status: 'DRAFT',
        lineItems: {
          create: estimateResult.line_items.map(item => ({
            itemDescription: item.item_description,
            location: item.location,
            category: item.category,
            issueType: item.action_type,
            laborHours: item.labor_hours,
            laborRate: item.labor_rate_per_hour,
            laborCost: item.labor_cost,
            materialCost: item.material_cost,
            totalCost: item.total_cost,
            originalCost: item.original_cost,
            depreciatedValue: item.depreciated_value,
            depreciationRate: item.depreciation_rate_per_year,
            conditionAdjustment: item.condition_adjustment_percent,
            estimatedLifetime: item.average_lifetime_years,
            currentAge: item.estimated_age_years,
            repairInstructions: Array.isArray(item.repair_instructions) 
              ? item.repair_instructions.join('\n') 
              : item.repair_instructions,
            notes: item.notes,
          })),
        },
      },
      include: { 
        lineItems: true,
        inspection: {
          include: {
            property: true,
            unit: true,
          },
        },
        generatedBy: true,
      },
    });

    // Send notification
    await this.sendEstimateReadyNotification(estimate);

    return estimate;
  }

  /**
   * Generate estimate for maintenance request (without inspection)
   */
  async generateEstimateForMaintenance(
    requestId: number, 
    userId: number
  ): Promise<RepairEstimate> {
    const request = await this.prisma.maintenanceRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { 
        property: true, 
        unit: true, 
        asset: true,
        author: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`Maintenance request with ID ${requestId} not found`);
    }

    // Convert maintenance request to inventory item
    const inventoryItem = this.convertMaintenanceToInventory(request);
    const userLocation = await this.getLocationFromProperty(request.property);

    const agent = createEnhancedEstimateAgent(userLocation);
    const estimateResult = await agent.generateEstimate([inventoryItem]);

    // Save and link to maintenance request
    const estimate = await this.prisma.repairEstimate.create({
      data: {
        maintenanceRequestId: requestId,
        propertyId: request.propertyId,
        unitId: request.unitId,
        totalLaborCost: estimateResult.estimate_summary.total_labor_cost,
        totalMaterialCost: estimateResult.estimate_summary.total_material_cost,
        totalProjectCost: estimateResult.estimate_summary.total_project_cost,
        itemsToRepair: estimateResult.estimate_summary.items_to_repair,
        itemsToReplace: estimateResult.estimate_summary.items_to_replace,
        generatedById: userId,
        status: 'DRAFT',
        lineItems: {
          create: estimateResult.line_items.map(item => ({
            itemDescription: item.item_description,
            location: item.location,
            category: item.category,
            issueType: item.action_type,
            laborHours: item.labor_hours,
            laborRate: item.labor_rate_per_hour,
            laborCost: item.labor_cost,
            materialCost: item.material_cost,
            totalCost: item.total_cost,
            originalCost: item.original_cost,
            depreciatedValue: item.depreciated_value,
            depreciationRate: item.depreciation_rate_per_year,
            conditionAdjustment: item.condition_adjustment_percent,
            estimatedLifetime: item.average_lifetime_years,
            currentAge: item.estimated_age_years,
            repairInstructions: Array.isArray(item.repair_instructions) 
              ? item.repair_instructions.join('\n') 
              : item.repair_instructions,
            notes: item.notes,
          })),
        },
      },
      include: { 
        lineItems: true,
        maintenanceRequest: {
          include: {
            property: true,
            unit: true,
          },
        },
        generatedBy: true,
      },
    });

    await this.sendEstimateReadyNotification(estimate);

    return estimate;
  }

  /**
   * Get estimate by ID
   */
  async getEstimateById(id: number): Promise<RepairEstimate> {
    const estimate = await this.prisma.repairEstimate.findUnique({
      where: { id },
      include: {
        inspection: {
          include: {
            property: true,
            unit: true,
          },
        },
        maintenanceRequest: {
          include: {
            property: true,
            unit: true,
          },
        },
        property: true,
        unit: true,
        generatedBy: true,
        approvedBy: true,
        lineItems: {
          orderBy: { category: 'asc' },
        },
      },
    });

    if (!estimate) {
      throw new NotFoundException(`Estimate with ID ${id} not found`);
    }

    return estimate;
  }

  /**
   * Get estimates with filtering
   */
  async getEstimates(query: EstimateQueryDto): Promise<{
    estimates: RepairEstimate[];
    total: number;
  }> {
    const where = {
      ...(query.inspectionId && { inspectionId: query.inspectionId }),
      ...(query.maintenanceRequestId && { maintenanceRequestId: query.maintenanceRequestId }),
      ...(query.propertyId && { propertyId: query.propertyId }),
      ...(query.status && { status: query.status }),
    };

    const [estimates, total] = await Promise.all([
      this.prisma.repairEstimate.findMany({
        where,
        include: {
          inspection: {
            include: {
              property: true,
              unit: true,
            },
          },
          maintenanceRequest: {
            include: {
              property: true,
              unit: true,
            },
          },
          property: true,
          unit: true,
          generatedBy: true,
          approvedBy: true,
          lineItems: true,
        },
        orderBy: { generatedAt: 'desc' },
        take: query.limit || 50,
        skip: query.offset || 0,
      }),
      this.prisma.repairEstimate.count({ where }),
    ]);

    return { estimates, total };
  }

  /**
   * Update estimate status
   */
  async updateEstimate(id: number, dto: UpdateEstimateDto, userId: number): Promise<RepairEstimate> {
    const estimate = await this.getEstimateById(id);

    const updateData: any = { ...dto };

    if (dto.status === 'APPROVED') {
      updateData.approvedAt = new Date();
      updateData.approvedById = userId;
    }

    const updatedEstimate = await this.prisma.repairEstimate.update({
      where: { id },
      data: updateData,
      include: {
        inspection: {
          include: {
            property: true,
            unit: true,
          },
        },
        maintenanceRequest: {
          include: {
            property: true,
            unit: true,
          },
        },
        lineItems: true,
        generatedBy: true,
        approvedBy: true,
      },
    });

    // Send approval notification
    if (dto.status === 'APPROVED') {
      await this.sendEstimateApprovedNotification(updatedEstimate);
    }

    return updatedEstimate;
  }

  /**
   * Convert estimate to maintenance requests
   */
  async convertEstimateToMaintenanceRequests(
    estimateId: number,
    userId: number
  ): Promise<MaintenanceRequest[]> {
    const estimate = await this.getEstimateById(estimateId);

    if (estimate.status !== 'APPROVED') {
      throw new BadRequestException('Only approved estimates can be converted to maintenance requests');
    }

    // Get estimate with line items
    const estimateWithItems = await this.prisma.repairEstimate.findUnique({
      where: { id: estimateId },
      include: { lineItems: true }
    });

    if (!estimateWithItems?.lineItems?.length) {
      throw new BadRequestException('Estimate has no line items to convert');
    }

    // Group line items by category (plumbing, electrical, etc.)
    const itemsByCategory = this.groupLineItemsByCategory(estimateWithItems.lineItems);

    const requests = [];
    for (const [category, items] of Object.entries(itemsByCategory)) {
      const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
      const priority = this.determinePriorityFromCost(totalCost);
      
      const request = await this.prisma.maintenanceRequest.create({
        data: {
          title: `${category.toUpperCase()} Repairs - Estimate ${estimateId}`,
          description: this.formatMaintenanceDescription(items, estimate),
          priority,
          authorId: userId,
          propertyId: estimate.propertyId!,
          unitId: estimate.unitId,
          status: 'PENDING',
        },
        include: {
          property: true,
          unit: true,
          author: true,
        },
      });
      
      requests.push(request);
    }

    // Update estimate status
    await this.prisma.repairEstimate.update({
      where: { id: estimateId },
      data: { status: 'COMPLETED' },
    });

    return requests;
  }

  /**
   * Get estimate statistics
   */
  async getEstimateStats(propertyId?: number): Promise<any> {
    const where = propertyId ? { propertyId } : {};

    const [
      total,
      draft,
      approved,
      completed,
      totalValue,
      avgValue
    ] = await Promise.all([
      this.prisma.repairEstimate.count({ where }),
      this.prisma.repairEstimate.count({ where: { ...where, status: 'DRAFT' } }),
      this.prisma.repairEstimate.count({ where: { ...where, status: 'APPROVED' } }),
      this.prisma.repairEstimate.count({ where: { ...where, status: 'COMPLETED' } }),
      this.prisma.repairEstimate.aggregate({
        where,
        _sum: { totalProjectCost: true },
      }),
      this.prisma.repairEstimate.aggregate({
        where,
        _avg: { totalProjectCost: true },
      }),
    ]);

    return {
      total,
      byStatus: {
        draft,
        approved,
        completed,
      },
      totalValue: totalValue._sum.totalProjectCost || 0,
      averageValue: avgValue._avg.totalProjectCost || 0,
    };
  }

  // Private helper methods

  private convertInspectionToInventoryItems(inspection: any): InventoryItem[] {
    const items: InventoryItem[] = [];

    for (const room of inspection.rooms) {
      for (const checklistItem of room.checklistItems) {
        if (checklistItem.requiresAction) {
          items.push({
            item_description: checklistItem.itemName,
            location: room.name,
            category: this.mapCategoryToTrade(checklistItem.category),
            condition: checklistItem.condition || 'FAIR',
            estimated_age_years: checklistItem.estimatedAge || 5,
            action_needed: this.determineActionNeeded(checklistItem.condition),
            notes: checklistItem.notes || '',
          });
        }
      }
    }

    return items;
  }

  private convertMaintenanceToInventory(request: any): InventoryItem {
    return {
      item_description: request.title,
      location: request.unit?.name || 'Property',
      category: this.inferCategoryFromDescription(request.description),
      condition: 'FAIR', // Default assumption
      estimated_age_years: 5, // Default assumption
      action_needed: this.inferActionFromDescription(request.description),
      notes: request.description,
    };
  }

  private async getLocationFromProperty(property: any): Promise<UserLocation> {
    // Parse address to extract location components
    // This is a simplified implementation - in production, you might use a geocoding service
    const addressParts = property.address.split(',').map((part: string) => part.trim());
    
    return {
      city: addressParts[addressParts.length - 3] || 'Unknown City',
      region: addressParts[addressParts.length - 2] || 'Unknown State',
      country: addressParts[addressParts.length - 1] || 'USA',
    };
  }

  private mapCategoryToTrade(category: string): string {
    const categoryMap: { [key: string]: string } = {
      'Plumbing': 'plumbing',
      'Electrical': 'electrical',
      'HVAC': 'hvac',
      'Appliances': 'appliances',
      'Flooring': 'flooring',
      'Walls': 'painter',
      'Windows': 'carpentry',
      'Doors': 'carpentry',
      'Lighting': 'electrical',
      'Cabinets': 'carpentry',
      'Countertops': 'carpentry',
      'Fixtures': 'plumbing',
      'Structure': 'carpentry',
      'Roofing': 'roofing',
      'Landscaping': 'landscaping',
    };

    return categoryMap[category] || 'general';
  }

  private determineActionNeeded(condition: InspectionCondition | null): 'repair' | 'replace' {
    if (!condition) return 'repair';
    
    const replaceConditions: InspectionCondition[] = ['DAMAGED', 'NON_FUNCTIONAL'];
    return replaceConditions.includes(condition) ? 'replace' : 'repair';
  }

  private inferCategoryFromDescription(description: string): string {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('plumbing') || lowerDesc.includes('leak') || lowerDesc.includes('toilet') || lowerDesc.includes('faucet')) {
      return 'plumbing';
    } else if (lowerDesc.includes('electrical') || lowerDesc.includes('outlet') || lowerDesc.includes('light')) {
      return 'electrical';
    } else if (lowerDesc.includes('hvac') || lowerDesc.includes('heat') || lowerDesc.includes('air')) {
      return 'hvac';
    } else if (lowerDesc.includes('paint') || lowerDesc.includes('wall')) {
      return 'painter';
    } else if (lowerDesc.includes('floor') || lowerDesc.includes('carpet')) {
      return 'flooring';
    } else {
      return 'general';
    }
  }

  private inferActionFromDescription(description: string): 'repair' | 'replace' {
    const lowerDesc = description.toLowerCase();
    
    if (lowerDesc.includes('replace') || lowerDesc.includes('broken') || lowerDesc.includes('not working')) {
      return 'replace';
    }
    
    return 'repair';
  }

  private groupLineItemsByCategory(lineItems: any[]): { [category: string]: any[] } {
    return lineItems.reduce((groups, item) => {
      const category = item.category || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(item);
      return groups;
    }, {});
  }

  private determinePriorityFromCost(totalCost: number): MaintenancePriority {
    if (totalCost > 1000) return MaintenancePriority.HIGH;
    if (totalCost > 500) return MaintenancePriority.MEDIUM;
    return MaintenancePriority.LOW;
  }

  private formatMaintenanceDescription(items: any[], estimate: any): string {
    const itemDescriptions = items.map(item => 
      `- ${item.itemDescription} (${item.location}): $${item.totalCost.toFixed(2)} - ${item.issueType}`
    ).join('\n');

    return `Maintenance work based on repair estimate ${estimate.id}:\n\n${itemDescriptions}\n\nTotal estimated cost: $${items.reduce((sum, item) => sum + item.totalCost, 0).toFixed(2)}`;
  }

  private async sendEstimateReadyNotification(estimate: any): Promise<void> {
    try {
      // Find property managers to notify
      const propertyManagers = await this.prisma.user.findMany({
        where: { role: 'PROPERTY_MANAGER' },
      });

      if (propertyManagers.length > 0) {
        const recipients = propertyManagers.map(pm => pm.username); // Assuming username is email

        for (const recipient of recipients) {
          await this.emailService.sendNotificationEmail(
            recipient,
            `Repair Estimate Ready - $${estimate.totalProjectCost.toFixed(2)}`,
            `A new repair estimate is ready for review. Total estimated cost: $${estimate.totalProjectCost.toFixed(2)}.`
          );
        }
      }
    } catch (error) {
      console.error('Failed to send estimate ready email:', error);
    }
  }

  private async sendEstimateApprovedNotification(estimate: any): Promise<void> {
    try {
      if (estimate.generatedBy?.username) {
        await this.emailService.sendNotificationEmail(
          estimate.generatedBy.username,
          `Estimate Approved - $${estimate.totalProjectCost.toFixed(2)}`,
          `Your repair estimate has been approved. Total approved amount: $${estimate.totalProjectCost.toFixed(2)}.`
        );
      }
    } catch (error) {
      console.error('Failed to send estimate approved email:', error);
    }
  }
}