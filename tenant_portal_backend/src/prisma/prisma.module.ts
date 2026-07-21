import { Global, Module } from '@nestjs/common';
import { PrismaService, } from './prisma.service';
import { DatabaseService } from './database.service';

@Global()
@Module({
  providers: [PrismaService, DatabaseService],
  exports: [PrismaService, DatabaseService],
})
export class PrismaModule {}
