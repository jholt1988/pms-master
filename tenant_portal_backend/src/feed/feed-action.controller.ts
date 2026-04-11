// src/feed/feed-action.controller.ts
import { Controller, Post, Param, Body, BadRequestException, Req, UseGuards } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
// import { CommunicationService } from '../pmre/communication.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { MockAuthGuard } from '../auth/mock-auth.guard';

@Controller('api/v2/feed')
@UseGuards(MockAuthGuard)
export class FeedActionController {
  constructor(
    private eventEmitter: EventEmitter2,
    private prisma: PrismaService,
    private paymentService: PaymentsService,
    // private communicationService: CommunicationService
  ) {}

  @Post(':id/action')
  async executeAction(@Param('id') id: string, @Body('intent') intent: string, @Req() req) {
    // 1. Extract context from the deterministic ID (e.g., payments_rent_delinquent_1234)
    const userId = req.user.userId;
    const [domain, type, entityId] = id.split('_');
    let actionResult;

    // 2. The Command Router
    try {
   switch (intent) {
      case 'send_3_day_notice':
        actionResult = { success: true, message: `Three day notice sent for ${entityId}` };
        break; // <-- MUST ADD THIS
        
      case 'send_late_notice':
        actionResult = { success: true, message: `Late notice sent for ${entityId}` };
        break; // <-- MUST ADD THIS

      case 'dismiss_manually':
        await this.prisma.feedItem.update({
          where: { id },
          data: { isDismissed: true, updatedAt: new Date() }
        });
        actionResult = { success: true };
        break; // <-- MUST ADD THIS

      default:
        throw new BadRequestException(`Unrecognized intent: ${intent}`);
    }
} catch (error) {
  actionResult = { success: false, message: error.message };
  
} 
  this.eventEmitter.emit('feed.action.executed', {
   feedItemId: id,
    intent,
    entityId,
    userId,
    timestamp: new Date().toISOString(),
    status: actionResult.success ? 'success' : 'failed',
    message: actionResult.message,
  });

return {success: true, message: `Action ${intent} executed ${actionResult.success ? 'successfully' : 'failed'}   for ${entityId}`};
  }
}