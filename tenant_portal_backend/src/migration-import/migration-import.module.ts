import { Module } from '@nestjs/common';
import { MigrationImportService } from './migration-import.service';

@Module({
  providers: [MigrationImportService],
  exports: [MigrationImportService],
})
export class MigrationImportModule {}
