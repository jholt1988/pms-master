import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { Request as ExpressRequest } from 'express';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { DecidePolicyApprovalTaskDto } from './dto/decide-policy-approval-task.dto';
import { PolicyApprovalService } from './policy-approval.service';
import { PolicyService, PolicySection } from './policy.service';

type AuthenticatedRequest = ExpressRequest & {
  user: {
    userId: string;
    role: Role;
  };
};

@Controller('policy')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class PolicyController {
  constructor(
    private readonly policyApprovalService: PolicyApprovalService,
    private readonly policyService: PolicyService,
  ) {}

  @Get('approval-tasks/pending')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getPendingApprovalTasks(@OrgId() orgId: string) {
    return this.policyApprovalService.listPendingTasks(orgId);
  }

  @Post('approval-tasks/:taskId/decision')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async decideApprovalTask(
    @Param('taskId') taskId: string,
    @Body() dto: DecidePolicyApprovalTaskDto,
    @Request() req: AuthenticatedRequest,
    @OrgId() orgId: string,
  ) {
    return this.policyApprovalService.decideTask(
      taskId,
      dto,
      { userId: req.user.userId, role: req.user.role },
      orgId,
    );
  }

  @Patch(':propertyId')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async updatePolicySection(
    @Param('propertyId') propertyId: string,
    @Body() dto: { section: PolicySection; data: unknown },
  ) {
    return this.policyService.updateSection(propertyId, dto.section, dto.data);
  }

  @Get(':propertyId')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getPropertyPolicy(@Param('propertyId') propertyId: string) {
    return this.policyService.getActiveBundle(propertyId);
  }
}
