import { Controller, Post, Body, Get, Logger, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { PropertyOsService } from './property-os.service';
import { AnalyzeV16RequestDto } from './dto/analyze-v16-request.dto';

@Controller('property-os')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PropertyOsController {
  private readonly logger = new Logger(PropertyOsController.name);

  constructor(private readonly propertyOsService: PropertyOsService) {}

  @Get('v16/engine-health')
  async engineHealth() {
    return this.propertyOsService.getEngineHealth();
  }

  @Post('v16/analyze')
  async analyzePropertyData(@Body() body: AnalyzeV16RequestDto) {
    this.logger.log('Received request for Property OS v1.6 analysis');

    const result = await this.propertyOsService.runV16Analysis(body);

    return {
      status: 'success',
      message: 'Analysis complete.',
      ...result,
    };
  }
}
