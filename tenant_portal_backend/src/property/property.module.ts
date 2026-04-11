
import { Module } from '@nestjs/common';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { UnitLifecycleService } from './unit-lifecycle.service';
import { PropertyRollupService } from './property-rollup.service';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  controllers: [PropertyController],
  providers: [PropertyService, UnitLifecycleService, PropertyRollupService, OrgContextGuard],
})
export class PropertyModule {}
