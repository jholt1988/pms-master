import { Module } from '@nestjs/common';
import { CommercialLeaseService } from './commercial-lease.service';
import { CommercialLeaseController } from './commercial-lease.controller';

@Module({
  providers: [CommercialLeaseService],
  controllers: [CommercialLeaseController],
  exports: [CommercialLeaseService],
})
export class CommercialLeaseModule {}
