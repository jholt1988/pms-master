import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OwnerDrawsController } from './owner-draws.controller';
import { OwnerDrawsService } from './owner-draws.service';

@Module({
  imports: [PrismaModule],
  controllers: [OwnerDrawsController],
  providers: [OwnerDrawsService],
  exports: [OwnerDrawsService],
})
export class OwnerPortalModule {}
