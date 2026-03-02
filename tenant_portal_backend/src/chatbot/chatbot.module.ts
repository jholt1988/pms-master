import { Module } from '@nestjs/common';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';
import { PrismaModule } from '../prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  imports: [PrismaModule, ConfigModule, ScheduleModule.forRoot()],
  controllers: [ChatbotController],
  providers: [ChatbotService, OrgContextGuard],
  exports: [ChatbotService],
})
export class ChatbotModule {}

