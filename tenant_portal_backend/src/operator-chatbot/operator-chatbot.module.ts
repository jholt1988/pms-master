import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { OperatorChatbotController } from './operator-chatbot.controller';
import { OperatorChatbotService } from './operator-chatbot.service';

@Module({
  imports: [PrismaModule, ChatbotModule],
  controllers: [OperatorChatbotController],
  providers: [OperatorChatbotService],
  exports: [OperatorChatbotService],
})
export class OperatorChatbotModule {}
