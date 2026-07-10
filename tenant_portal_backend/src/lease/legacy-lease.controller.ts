import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeaseService } from './lease.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('lease')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LegacyLeaseController {
  constructor(private readonly leaseService: LeaseService) {}

  @Get()
  @Roles('PROPERTY_MANAGER')
  getLegacyLeases() {
    return this.leaseService.getAllLeases();
  }
}
