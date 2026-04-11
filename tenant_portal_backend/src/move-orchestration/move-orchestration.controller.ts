import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { MoveOrchestrationService } from './move-orchestration.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('move-orchestration')
@UseGuards(AuthGuard('jwt'))
export class MoveOrchestrationController {
  constructor(private readonly moveOrchestrationService: MoveOrchestrationService) {}

  @Post('move-in')
  async startMoveIn(@Body() body: { leaseId: string; tenantId: string }) {
    return this.moveOrchestrationService.startMoveIn(body.leaseId, body.tenantId);
  }

  @Post('move-out')
  async startMoveOut(@Body() body: { leaseId: string; tenantId: string }) {
    return this.moveOrchestrationService.startMoveOut(body.leaseId, body.tenantId);
  }
}
