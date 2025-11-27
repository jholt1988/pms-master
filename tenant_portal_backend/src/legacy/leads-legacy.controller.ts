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
import { Roles } from '../auth/roles.decorator';
import { LeadStatus, Role } from '@prisma/client';

interface AuthenticatedRequest {
  user: {
    userId: number;
    role: Role;
  };
}

@Controller('api/leads')
@UseGuards(AuthGuard('jwt'), RolesGuard)
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
  ) {
    const filters: any = {};
    if (status) filters.status = this.parseStatus(status);
    if (search) filters.search = search;
    if (dateFrom) filters.dateFrom = new Date(dateFrom);
    if (dateTo) filters.dateTo = new Date(dateTo);
    if (limit) filters.limit = Number(limit);
    if (offset) filters.offset = Number(offset);

    const result = await this.leasingService.getLeads(filters);
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
  ) {
    const stats = await this.leasingService.getLeadStatistics(
      dateFrom ? new Date(dateFrom) : undefined,
      dateTo ? new Date(dateTo) : undefined,
    );
    return {
      success: true,
      stats,
    };
  }

  @Get(':id/messages')
  async getMessages(@Param('id') id: string) {
    const messages = await this.leasingService.getConversationHistory(id);
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
    const lead = await this.leasingService.updateLeadStatus(id, status as LeadStatus);
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
