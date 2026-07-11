import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EsignatureService } from './esignature.service';
import { EsignatureController } from './esignature.controller';
import { EsignatureWebhookController } from './esignature-webhook.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DocumentsModule } from '../documents/documents.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PropertyOsModule } from '../property-os/property-os.module';

@Module({
  imports: [ConfigModule, PrismaModule, DocumentsModule, NotificationsModule, PropertyOsModule],
  controllers: [EsignatureController, EsignatureWebhookController],
  providers: [EsignatureService],
  exports: [EsignatureService],
})
export class EsignatureModule {}
