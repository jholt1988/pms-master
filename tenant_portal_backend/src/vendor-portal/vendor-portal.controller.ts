import { Controller, Get, Param, Post } from '@nestjs/common';
import { VendorPortalService } from './vendor-portal.service';

@Controller('vendor-portal')
export class VendorPortalController {
  constructor(private readonly svc: VendorPortalService) {}

  @Get('work-orders/:vendorId')
  workOrders(@Param('vendorId') vendorId: string) { return this.svc.getWorkOrders(vendorId); }

  @Post('work-orders/:requestId/accept/:vendorId')
  accept(@Param('requestId') requestId: string, @Param('vendorId') vendorId: string) { return this.svc.acceptWorkOrder(requestId, vendorId); }

  @Post('work-orders/:requestId/complete')
  complete(@Param('requestId') requestId: string) { return this.svc.completeWorkOrder(requestId); }
}
