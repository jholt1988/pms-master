// Story 17: Move-In/Move-Out Workflow Orchestration
// POST /move Orchestration/start, POST /move Orchestration/complete, GET /move Orchestration/:id
// Dependencies: 2, 3, 10, 11, 16 | Estimate: Large

import { Controller, Get, Post, Param, Body, Query, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface StartMoveInDto {
  unitId: number;
  leaseId?: number;
  tenantId: number;
  scheduledDate: string;
  notes?: string;
}

interface CompleteMoveInDto {
  actualDate: string;
  inventoryChecked?: boolean;
  keysTransferred?: boolean;
  utilitiesVerified?: boolean;
  notes?: string;
}

interface StartMoveOutDto {
  unitId: number;
  tenantId: number;
  scheduledDate: string;
  reason?: string;
  notes?: string;
}

interface CompleteMoveOutDto {
  actualDate: string;
  securityDepositReturn?: number;
  finalWalkthroughCompleted?: boolean;
  damagesNoted?: string;
  cleaningRequired?: boolean;
  notes?: string;
}

@Controller('move-orchestration')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class MoveOrchestrationController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('start-move-in')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async startMoveIn(@Body() dto: StartMoveInDto) {
    const unit = await this.prisma.unit.findUnique({
      where: { id: dto.unitId },
    });
    if (!unit) throw new NotFoundException('Unit not found');

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: dto.tenantId },
    });
    if (!tenant) throw new NotFoundException('Tenant not found');

    if (dto.leaseId) {
      const lease = await this.prisma.lease.findUnique({ where: { id: dto.leaseId } });
      if (!lease) throw new NotFoundException('Lease not found');
    }

    // Create move orchestration record
    const moveIn = await this.prisma.moveOrchestration.create({
      data: {
        type: 'MOVE_IN',
        unitId: dto.unitId,
        tenantId: dto.tenantId,
        leaseId: dto.leaseId,
        scheduledDate: new Date(dto.scheduledDate),
        status: 'SCHEDULED',
        notes: dto.notes,
      },
    });

    // Create decisions for each step
    await this.prisma.decision.createMany({
      data: [
        { domain: 'leasing', type: 'MOVE_IN_SCHEDULED', entityId: String(moveIn.id), title: `Move-in scheduled for ${tenant.fullName}`, priority: 60, urgency: 'this_week', context: { moveId: moveIn.id } },
        { domain: 'leasing', type: 'INVENTORY_CHECK', entityId: String(moveIn.id), title: `Complete inventory check`, priority: 50, urgency: 'this_week', context: { moveId: moveIn.id } },
        { domain: 'leasing', type: 'KEY_TRANSFER', entityId: String(moveIn.id), title: `Transfer keys to tenant`, priority: 50, urgency: 'today', context: { moveId: moveIn.id } },
      ],
    });

    console.log('[MOVE] Move-in started:', moveIn.id);

    return { id: moveIn.id, status: moveIn.status, scheduledDate: moveIn.scheduledDate };
  }

  @Post('complete-move-in')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async completeMoveIn(@Param('id') id: string, @Body() dto: CompleteMoveInDto) {
    const moveId = parseInt(id, 10);
    const moveIn = await this.prisma.moveOrchestration.findUnique({ where: { id: moveId } });
    if (!moveIn) throw new NotFoundException('Move orchestration not found');
    if (moveIn.type !== 'MOVE_IN') throw new BadRequestException('Not a move-in');

    const completed = await this.prisma.moveOrchestration.update({
      where: { id: moveId },
      data: {
        status: 'COMPLETED',
        actualDate: new Date(dto.actualDate),
        inventoryChecked: dto.inventoryChecked || false,
        keysTransferred: dto.keysTransferred || false,
        utilitiesVerified: dto.utilitiesVerified || false,
        notes: dto.notes,
        completedAt: new Date(),
      },
    });

    // Update unit status
    await this.prisma.unit.update({
      where: { id: moveIn.unitId },
      data: { status: 'OCCUPIED' },
    });

    // Resolve related decisions
    await this.prisma.decision.updateMany({
      where: { domain: 'leasing', entityId: String(moveId), resolved: false },
      data: { resolved: true, resolvedAt: new Date() },
    });

    console.log('[MOVE] Move-in completed:', moveId);

    return { id: completed.id, status: completed.status, completedAt: completed.completedAt };
  }

  @Post('start-move-out')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async startMoveOut(@Body() dto: StartMoveOutDto) {
    const unit = await this.prisma.unit.findUnique({ where: { id: dto.unitId } });
    if (!unit) throw new NotFoundException('Unit not found');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: dto.tenantId } });
    if (!tenant) throw new NotFoundException('Tenant not found');

    const moveOut = await this.prisma.moveOrchestration.create({
      data: {
        type: 'MOVE_OUT',
        unitId: dto.unitId,
        tenantId: dto.tenantId,
        scheduledDate: new Date(dto.scheduledDate),
        status: 'SCHEDULED',
        notes: dto.notes,
      },
    });

    // Create move-out decisions
    await this.prisma.decision.createMany({
      data: [
        { domain: 'leasing', type: 'MOVE_OUT_SCHEDULED', entityId: String(moveOut.id), title: `Move-out scheduled`, priority: 60, urgency: 'this_week', context: { moveId: moveOut.id } },
        { domain: 'leasing', type: 'FINAL_WALKTHROUGH', entityId: String(moveOut.id), title: `Schedule final walkthrough`, priority: 50, urgency: 'this_week', context: { moveId: moveOut.id } },
        { domain: 'leasing', type: 'SECURITY_DEPOSIT', entityId: String(moveOut.id), title: `Process security deposit return`, priority: 40, urgency: 'this_week', context: { moveId: moveOut.id } },
      ],
    });

    // Mark unit as pending move-out
    await this.prisma.unit.update({ where: { id: dto.unitId }, data: { status: 'PENDING_MOVE_OUT' } });

    console.log('[MOVE] Move-out started:', moveOut.id);

    return { id: moveOut.id, status: moveOut.status, scheduledDate: moveOut.scheduledDate };
  }

  @Post('complete-move-out')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async completeMoveOut(@Param('id') id: string, @Body() dto: CompleteMoveOutDto) {
    const moveId = parseInt(id, 10);
    const moveOut = await this.prisma.moveOrchestration.findUnique({ where: { id: moveId } });
    if (!moveOut) throw new NotFoundException('Move orchestration not found');
    if (moveOut.type !== 'MOVE_OUT') throw new BadRequestException('Not a move-out');

    const completed = await this.prisma.moveOrchestration.update({
      where: { id: moveId },
      data: {
        status: 'COMPLETED',
        actualDate: new Date(dto.actualDate),
        securityDepositReturn: dto.securityDepositReturn,
        finalWalkthroughCompleted: dto.finalWalkthroughCompleted || false,
        damagesNoted: dto.damagesNoted,
        cleaningRequired: dto.cleaningRequired || false,
        notes: dto.notes,
        completedAt: new Date(),
      },
    });

    // Update unit to vacant
    await this.prisma.unit.update({ where: { id: moveOut.unitId }, data: { status: 'VACANT' } });

    // Resolve decisions
    await this.prisma.decision.updateMany({
      where: { domain: 'leasing', entityId: String(moveId), resolved: false },
      data: { resolved: true, resolvedAt: new Date() },
    });

    console.log('[MOVE] Move-out completed:', moveId);

    return { id: completed.id, status: completed.status, completedAt: completed.completedAt };
  }

  @Get()
  async listMoves(@Query('status') status?: string, @Query('type') type?: string) {
    const where: any = {};
    if (status) where.status = status;
    if (type) where.type = type;

    const moves = await this.prisma.moveOrchestration.findMany({
      where,
      include: {
        unit: { include: { property: true } },
        tenant: true,
      },
      orderBy: { scheduledDate: 'desc' },
      take: 50,
    });

    return { data: moves, total: moves.length };
  }

  @Get(':id')
  async getMove(@Param('id') id: string) {
    const moveId = parseInt(id, 10);
    const move = await this.prisma.moveOrchestration.findUnique({
      where: { id: moveId },
      include: {
        unit: { include: { property: true } },
        tenant: true,
        lease: true,
      },
    });
    if (!move) throw new NotFoundException('Move not found');
    return move;
  }
}