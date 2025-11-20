
import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RentEstimatorService } from './rent-estimator.service';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/roles.guard';

@Controller('rent-estimator')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.PROPERTY_MANAGER)
export class RentEstimatorController {
  constructor(private readonly rentEstimatorService: RentEstimatorService) {}

  @Get()
  estimateRent(
    @Query('propertyId') propertyId: string,
    @Query('unitId') unitId: string,
    // Add more query parameters for other factors like bedrooms, bathrooms, etc.
  ) {
    return this.rentEstimatorService.estimateRent(Number(propertyId), Number(unitId));
  }
}
