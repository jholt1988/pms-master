import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { VendorsService } from './vendors.service';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';

@Controller('vendors')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@Roles('PROPERTY_MANAGER', 'ADMIN')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post()
  create(@OrgId() orgId: string, @Body() createDto: any) {
    return this.vendorsService.create(orgId, createDto);
  }

  @Get()
  findAll(@OrgId() orgId: string) {
    return this.vendorsService.findAll(orgId);
  }

  @Get('1099-export')
  export1099s(@OrgId() orgId: string) {
    return this.vendorsService.generate1099Export(orgId);
  }
}
