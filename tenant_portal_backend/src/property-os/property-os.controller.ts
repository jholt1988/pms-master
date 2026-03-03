import { Controller, Post, Body, Get } from '@nestjs/common';
import { PropertyOsService } from './property-os.service';

@Controller('property-os')
export class PropertyOsController {
  constructor(private readonly propertyOsService: PropertyOsService) {}

  @Get('v16/engine-health')
  async engineHealth() {
    return this.propertyOsService.getEngineHealth();
  }

  @Post('v16/analyze')
  async analyzePropertyData(@Body() body: any) {
    // The middleware has already validated the 'confidence' part of the payload,
    // but the full request body is passed to the service.
    
    console.log('Received request for Property OS v1.6 analysis');

    const result = await this.propertyOsService.runV16Analysis(body);
    
    return {
      status: 'success',
      message: 'Analysis complete.',
      ...result,
    };
  }
}
