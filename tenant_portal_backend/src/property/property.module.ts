
import { Module } from '@nestjs/common';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  controllers: [PropertyController],
  providers: [PropertyService, OrgContextGuard],
})
export class PropertyModule {}
