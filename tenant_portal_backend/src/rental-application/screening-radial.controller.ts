// Story 4: Screen Applicant with Policy Engine
// POST /screening/:id/decision
// Dependencies: Story 3 | Estimate: Large

import { Controller, Post, Body, Param, UseGuards, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface ScreeningDecisionDto {
  decision: 'APPROVE' | 'DENY' | 'CONDITIONAL';
  reason?: string;
  note?: string;
}

@Controller('screening')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ScreeningRadialController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':id/decision')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async decision(
    @Param('id') id: string,
    @Body() dto: ScreeningDecisionDto,
  ) {
    const applicationId = parseInt(id, 10);

    // Find application
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id: applicationId },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    // Store decision
    const decision = await this.prisma.applicationDecision.create({
      data: {
        applicationId,
        decision: dto.decision,
        reason: dto.reason,
        note: dto.note,
        decidedAt: new Date(),
      },
    });

    // Update application status
    const newStatus = dto.decision === 'APPROVE' ? 'APPROVED' : dto.decision === 'DENY' ? 'DENIED' : 'CONDITIONAL';
    await this.prisma.rentalApplication.update({
      where: { id: applicationId },
      data: { status: newStatus },
    });

    // Trigger lease creation on approve
    if (dto.decision === 'APPROVE') {
      console.log('[RADIAL] ApplicationApproved - Trigger lease creation for:', applicationId);
    }

    return {
      id: decision.id,
      applicationId,
      decision: dto.decision,
      status: newStatus,
    };
  }
}