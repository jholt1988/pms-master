import { Module } from '@nestjs/common';
import { VendorPortalService } from './vendor-portal.service';
import { VendorPortalController } from './vendor-portal.controller';

@Module({
  providers: [VendorPortalService],
  controllers: [VendorPortalController],
  exports: [VendorPortalService],
})
export class VendorPortalModule {}
