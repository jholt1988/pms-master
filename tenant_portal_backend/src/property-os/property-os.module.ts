import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { PropertyOsController } from './property-os.controller';
import { PropertyOsService } from './property-os.service';
import { PropertyOsV16ValidationMiddleware } from '../middleware/property-os-v16.middleware';
import { SecurityEventsModule } from '../security-events/security-events.module';

@Module({
  imports: [SecurityEventsModule],
  controllers: [PropertyOsController],
  providers: [PropertyOsService],
  exports: [PropertyOsService],
})
export class PropertyOsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(PropertyOsV16ValidationMiddleware)
      .forRoutes({ path: 'property-os/v16/analyze', method: RequestMethod.POST });
  }
}
