import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OperatorVendorsController } from './operator-vendors.controller';
import { OperatorVendorsService } from './operator-vendors.service';

@Module({
  imports: [PrismaModule],
  controllers: [OperatorVendorsController],
  providers: [OperatorVendorsService],
  exports: [OperatorVendorsService],
})
export class OperatorVendorsModule {}
