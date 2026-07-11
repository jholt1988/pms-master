
import { Module } from '@nestjs/common';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { UnitLifecycleService } from './unit-lifecycle.service';
import { PropertyRollupService } from './property-rollup.service';

@Module({
  controllers: [PropertyController],
  providers: [PropertyService, UnitLifecycleService, PropertyRollupService],
  exports: [PropertyService, UnitLifecycleService, PropertyRollupService],
})
export class PropertyModule {}
