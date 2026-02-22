import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EsignatureService } from './esignature.service';
import { EsignatureController } from './esignature.controller';
import { EsignatureWebhookController } from './esignature-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  imports: [ConfigModule, PrismaModule, DocumentsModule, NotificationsModule],
  controllers: [EsignatureController, EsignatureWebhookController],
  providers: [EsignatureService, OrgContextGuard],
  exports: [EsignatureService],
})
export class EsignatureModule {}
