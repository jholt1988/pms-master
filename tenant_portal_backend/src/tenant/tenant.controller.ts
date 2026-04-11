import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TenantService } from './tenant.service';
import { ListTenantsDto } from './dto/list-tenants.dto';
import { UpdateTenantProfileDto } from './dto/update-tenant-profile.dto';
import { CreateHouseholdMemberDto } from './dto/create-household-member.dto';
import { CreateViolationDto } from './dto/create-violation.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: { sub: string; username: string; role: string };
}

@Controller('tenants')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class TenantController {
  constructor(private readonly tenantService: TenantService) {}

  @Get()
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async listTenants(@Query() query: ListTenantsDto, @OrgId() orgId?: string) {
    return this.tenantService.listTenants(query, orgId);
  }

  @Get(':id')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getTenant(@Param('id') id: string) {
    return this.tenantService.getTenantById(id);
  }

  @Get(':id/workspace')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getTenantWorkspace(@Param('id') id: string) {
    return this.tenantService.getTenantWorkspace(id);
  }

  @Get(':id/health')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getTenantHealth(@Param('id') id: string) {
    return this.tenantService.refreshHealth(id);
  }

  @Get(':id/activity')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getActivityTimeline(
    @Param('id') id: string,
    @Query('limit') limit?: string,
  ) {
    return this.tenantService.getActivityTimeline(id, limit ? parseInt(limit, 10) : 50);
  }

  @Put(':id/profile')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async updateProfile(
    @Param('id') id: string,
    @Body() dto: UpdateTenantProfileDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tenantService.updateProfile(id, dto, req.user?.sub);
  }

  @Post(':id/household')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async addHouseholdMember(
    @Param('id') id: string,
    @Body() dto: CreateHouseholdMemberDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tenantService.addHouseholdMember(id, dto, req.user?.sub);
  }

  @Delete('household/:memberId')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async removeHouseholdMember(
    @Param('memberId') memberId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tenantService.removeHouseholdMember(memberId, req.user?.sub);
  }

  @Post(':id/violations')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async addViolation(
    @Param('id') id: string,
    @Body() dto: CreateViolationDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tenantService.addViolation(id, dto, req.user?.sub);
  }

  @Put('violations/:violationId/resolve')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async resolveViolation(
    @Param('violationId') violationId: string,
    @Body('notes') notes: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.tenantService.resolveViolation(violationId, notes, req.user?.sub);
  }
}
