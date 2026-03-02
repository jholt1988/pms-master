
import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'ok',
      service: 'tenant_portal_backend',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/readiness')
  getReadiness() {
    return {
      status: 'ready',
      checks: {
        api: 'ok',
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('health/liveness')
  getLiveness() {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }
}
