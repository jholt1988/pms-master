import { Module } from '@nestjs/common';
import { MilService } from './mil.service';
import { CryptoService } from './crypto.service';
import { KeyringService } from './keyring.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [MilService, CryptoService, KeyringService],
  exports: [MilService],
})
export class MilModule {}
