import { Global, Module } from '@nestjs/common';
import { AIProviderService } from './ai-provider.service';

@Global()
@Module({
  providers: [AIProviderService],
  exports: [AIProviderService],
})
export class AIProviderModule {}
