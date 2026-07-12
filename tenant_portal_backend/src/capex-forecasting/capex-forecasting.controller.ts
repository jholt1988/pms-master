import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { CapexForecastingService } from './capex-forecasting.service';

@Controller('capex-forecasting')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
export class CapexForecastingController {
  constructor(private readonly capexService: CapexForecastingService) {}

  @Post('forecasts')
  createForecast(@OrgId() orgId: string, @Body() dto: any) {
    return this.capexService.createForecast(orgId, dto);
  }

  @Get('forecasts')
  listForecasts(
    @OrgId() orgId: string,
    @Query('propertyId') propertyId?: string,
    @Query('year') year?: string,
    @Query('urgency') urgency?: string,
  ) {
    return this.capexService.listForecasts(orgId, {
      propertyId,
      year: year ? parseInt(year, 10) : undefined,
      urgency,
    });
  }

  @Get('forecasts/:id')
  getForecast(@OrgId() orgId: string, @Param('id') id: string) {
    return this.capexService.getForecast(orgId, id);
  }

  @Patch('forecasts/:id/approve')
  approveForecast(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body('approvedBudget') approvedBudget: number,
  ) {
    return this.capexService.approveForecast(orgId, id, approvedBudget);
  }

  @Patch('forecasts/:id/complete')
  completeForecast(
    @OrgId() orgId: string,
    @Param('id') id: string,
    @Body('actualCostCents') actualCostCents: number,
  ) {
    return this.capexService.completeForecast(orgId, id, actualCostCents);
  }

  @Post('properties/:propertyId/generate')
  generateForecasts(
    @OrgId() orgId: string,
    @Param('propertyId') propertyId: string,
  ) {
    return this.capexService.aiGenerateForecasts(orgId, propertyId);
  }

  @Get('summary')
  getSummary(
    @OrgId() orgId: string,
    @Query('year') year?: string,
  ) {
    return this.capexService.getBudgetSummary(
      orgId,
      year ? parseInt(year, 10) : new Date().getFullYear(),
    );
  }
}
