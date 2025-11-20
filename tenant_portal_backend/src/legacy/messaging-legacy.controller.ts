import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { MessagingService } from '../messaging/messaging.service';
import { BulkMessagingService } from '../messaging/bulk-messaging.service';
import {
  CreateMessageDto,
  CreateConversationDto,
  GetConversationsQueryDto,
  GetMessagesQueryDto,
  CreateBulkMessageDto,
} from '../messaging/dto/messaging.dto';

interface AuthenticatedRequest {
  user: {
    userId: number;
    username: string;
    role: string;
  };
}

@Controller('messaging')
@UseGuards(AuthGuard('jwt'))
export class MessagingLegacyController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly bulkMessagingService: BulkMessagingService,
  ) {}

  @Get('conversations')
  async listConversations(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetConversationsQueryDto,
  ) {
    return this.messagingService.getConversations(req.user.userId, query);
  }

  @Get('conversations/:id')
  async getConversation(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.messagingService.getConversationById(Number(id), req.user.userId);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.messagingService.getConversationMessages(Number(id), req.user.userId, query);
  }

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async createConversation(
    @Body() dto: CreateConversationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.messagingService.createConversation(dto, req.user.userId);
  }

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Body() dto: CreateMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.messagingService.sendMessage(dto, req.user.userId);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  async queueBulk(
    @Body() dto: CreateBulkMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.bulkMessagingService.queueBulkMessage(dto, req.user.userId);
  }

  @Post('bulk/preview')
  async previewBulk(
    @Body() dto: CreateBulkMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.bulkMessagingService.previewBulkMessage(dto, req.user.userId);
  }
}
