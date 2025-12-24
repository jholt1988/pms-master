import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeaseService } from './lease.service';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';

@Controller('lease')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class LegacyLeaseController {
  constructor(private readonly leaseService: LeaseService) {}

  @Get()
  @Roles(Role.PROPERTY_MANAGER)
  getLegacyLeases() {
    return this.leaseService.getAllLeases();
  }
}
