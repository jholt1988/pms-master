import { Module } from '@nestjs/common';
import { TenantController } from './tenant.controller';
import { TenantService } from './tenant.service';
import { TenantHealthService } from './tenant-health.service';
import { TenantFeedController } from './tenant-feed.controller';
import { TenantFeedService } from './tenant-feed.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TenantController, TenantFeedController],
  providers: [TenantService, TenantHealthService, TenantFeedService],
  exports: [TenantService, TenantHealthService, TenantFeedService],
})
export class TenantModule {}
