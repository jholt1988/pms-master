import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BriefingModule } from '../briefing/briefing.module';
import { DashboardModule } from '../dashboard/dashboard.module';
import { PolicyModule } from '../policy/policy.module';
import { DecisionsModule } from '../decisions/decisions.module';
import { CommandCenterController } from './command-center.controller';
import { CommandCenterService } from './command-center.service';

@Module({
  imports: [PrismaModule, BriefingModule, DashboardModule, PolicyModule, DecisionsModule],
  controllers: [CommandCenterController],
  providers: [CommandCenterService],
  exports: [CommandCenterService],
})
export class CommandCenterModule {}
