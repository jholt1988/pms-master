import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsModule } from '../documents/documents.module';
import { OperatorDocumentsController } from './operator-documents.controller';
import { OperatorDocumentsService } from './operator-documents.service';

@Module({
  imports: [PrismaModule, DocumentsModule],
  controllers: [OperatorDocumentsController],
  providers: [OperatorDocumentsService],
  exports: [OperatorDocumentsService],
})
export class OperatorDocumentsModule {}
