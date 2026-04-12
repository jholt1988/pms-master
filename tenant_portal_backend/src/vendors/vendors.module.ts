import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VendorsController } from './vendors.controller';
import { VendorsService } from './vendors.service';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  imports: [PrismaModule],
  controllers: [VendorsController],
  providers: [VendorsService, OrgContextGuard],
  exports: [VendorsService],
})
export class VendorsModule {}
