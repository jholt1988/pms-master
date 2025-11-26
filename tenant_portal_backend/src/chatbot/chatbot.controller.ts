import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ChatbotService } from './chatbot.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: number;
    username: string;
    role: string;
  };
}

@Controller('chatbot')
@UseGuards(AuthGuard('jwt'))
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  /**
   * Send a message to the chatbot
   * POST /api/chatbot/message
   */
  @Post('message')
  async sendMessage(
    @Body() body: { message: string; sessionId?: string },
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatbotService.sendMessage(req.user.userId, body.message, body.sessionId);
  }

  /**
   * Get session history
   * GET /api/chatbot/session/:sessionId
   */
  @Get('session/:sessionId')
  async getSessionHistory(
    @Param('sessionId') sessionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.chatbotService.getSessionHistory(sessionId, req.user.userId);
  }
}

