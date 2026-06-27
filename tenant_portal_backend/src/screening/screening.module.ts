import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ScreeningController } from './screening.controller';
import { ScreeningService } from './screening.service';
import { StubScreeningProvider } from './stub-screening.provider';

export const SCREENING_PROVIDER = 'SCREENING_PROVIDER';

@Module({
  imports: [PrismaModule],
  controllers: [ScreeningController],
  providers: [
    ScreeningService,
    {
      provide: SCREENING_PROVIDER,
      useClass: StubScreeningProvider, // Replace with real provider in production
    },
  ],
  exports: [ScreeningService, SCREENING_PROVIDER],
})
export class ScreeningModule {}
