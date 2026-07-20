import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { DatabaseService } from './database.service';

/**
 * DatabaseModule replaces PrismaModule and exports both services:
 * - PrismaService (unchanged, for backward compatibility)
 * - DatabaseService (additive wrapper)
 */
@Global()
@Module({
  providers: [PrismaService, DatabaseService],
  exports: [PrismaService, DatabaseService],
})
export class DatabaseModule {}
