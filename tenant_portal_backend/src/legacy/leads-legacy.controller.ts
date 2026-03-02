import {
  Controller,
  Get,
  Query,
  Param,
  Patch,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeasingService } from '../leasing/leasing.service';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { Roles } from '../auth/roles.decorator';
import { LeadStatus, Role } from '@prisma/client';

interface AuthenticatedRequest {
  user: {
    userId: number;
    role: Role;
  };
}

@Controller('api/leads')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@Roles(Role.PROPERTY_MANAGER)
export class LeadsLegacyController {
  constructor(private readonly leasingService: LeasingService) {}

  @Get()
  async listLeads(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const filters: any = {};
    if (status) filters.status = this.parseStatus(status);
    if (search) filters.search = search;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);
    if (limit) filters.limit = Number(limit);
    if (offset) filters.offset = Number(offset);

    const orgId = (req as any)?.org?.orgId as string | undefined;
    const result = await this.leasingService.getLeads({ ...filters, orgId });
    return {
      success: true,
      leads: result.leads,
      total: result.total,
    };
  }

  @Get('statistics/dashboard')
  async getStats(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Request() req?: AuthenticatedRequest,
  ) {
    const orgId = (req as any)?.org?.orgId as string | undefined;
    const stats = await this.leasingService.getLeadStatistics(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
      orgId,
    );
    return {
      success: true,
      stats,
    };
  }

  @Get(':id/messages')
  async getMessages(@Param('id') id: string, @Request() req?: AuthenticatedRequest) {
    const orgId = (req as any)?.org?.orgId as string | undefined;
    const messages = await this.leasingService.getConversationHistory(id, orgId);
    return {
      success: true,
      messages,
    };
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Request() req: AuthenticatedRequest, @Query('status') _status?: string) {
    const status = _status || (req as any).body?.status;
    if (!status) {
      throw new BadRequestException('Status is required');
    }
    const orgId = (req as any)?.org?.orgId as string | undefined;
    const lead = await this.leasingService.updateLeadStatus(id, status as LeadStatus, orgId);
    return {
      success: true,
      lead,
    };
  }

  private parseStatus(value: string): LeadStatus {
    const normalized = value.trim().toUpperCase();
    if ((Object.values(LeadStatus) as string[]).includes(normalized)) {
      return normalized as LeadStatus;
    }
    throw new BadRequestException(`Unsupported status filter: ${value}`);
  }
}
