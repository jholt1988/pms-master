import { Module } from '@nestjs/common';
import { ScreeningController } from './screening.controller';
import { ScreeningService } from './screening.service';
import { StubScreeningProvider } from './stub-screening.provider';
import { SCREENING_PROVIDER } from './screening.constants';

@Module({
  imports: [],
  controllers: [ScreeningController],
  providers: [
    ScreeningService,
    {
      provide: SCREENING_PROVIDER,
      useClass: StubScreeningProvider,
    },
  ],
  exports: [ScreeningService, SCREENING_PROVIDER],
})
export class ScreeningModule {}
