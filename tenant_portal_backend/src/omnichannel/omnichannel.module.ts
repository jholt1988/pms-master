import { Module } from '@nestjs/common';
import { OmnichannelController } from './omnichannel.controller';
import { OmnichannelService } from './omnichannel.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OmnichannelController],
  providers: [OmnichannelService],
  exports: [OmnichannelService],
})
export class OmnichannelModule {}
