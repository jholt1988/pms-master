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
import { OrgContextGuard } from '../common/org-context/org-context.guard';
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
    userId: string;
    username: string;
    role: string;
  };
}

@Controller('messaging')
@UseGuards(AuthGuard('jwt'), OrgContextGuard)
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
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.messagingService.getConversations(req.user.userId, query, orgId);
  }

  @Get('conversations/:id')
  async getConversation(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.messagingService.getConversationById(Number(id), req.user.userId, orgId);
  }

  @Get('conversations/:id/messages')
  async getMessages(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
    @Query() query: GetMessagesQueryDto,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.messagingService.getConversationMessages(Number(id), req.user.userId, query, orgId);
  }

  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async createConversation(
    @Body() dto: CreateConversationDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.messagingService.createConversation(dto, req.user.userId, orgId);
  }

  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Body() dto: CreateMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.messagingService.sendMessage(dto, req.user.userId, orgId);
  }

  @Post('bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  async queueBulk(
    @Body() dto: CreateBulkMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.bulkMessagingService.queueBulkMessage(dto, req.user.userId, orgId);
  }

  @Post('bulk/preview')
  async previewBulk(
    @Body() dto: CreateBulkMessageDto,
    @Request() req: AuthenticatedRequest,
  ) {
    const orgId = (req as any).org?.orgId as string | undefined;
    return this.bulkMessagingService.previewBulkMessage(dto, req.user.userId, orgId);
  }
}
