import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
  Param,
  Query,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
  Req,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { MessagingService } from './messaging.service';
import { BulkMessagingService } from './bulk-messaging.service';
import {
  CreateMessageDto,
  CreateConversationDto,
  CreateThreadDto,
  GetConversationsQueryDto,
  GetMessagesQueryDto,
  CreateBulkMessageDto,
} from './dto/messaging.dto';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgIdOptional } from '../common/org-context/org-id-optional.decorator';
import { Roles } from '../auth/roles.decorator';

import { AuditLogService } from '../shared/audit-log.service';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
    role: string;
  };
}

@Controller('messaging')
@UseGuards(AuthGuard('jwt'), OrgContextGuard)
export class MessagingController {
  constructor(
    private readonly messagingService: MessagingService,
    private readonly bulkMessagingService: BulkMessagingService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private attachmentAuditMetadata(attachmentUrls?: string[]) {
    const normalized = Array.isArray(attachmentUrls)
      ? attachmentUrls.map((url) => String(url).trim()).filter(Boolean)
      : [];

    return {
      hasAttachments: normalized.length > 0,
      attachmentCount: normalized.length,
      attachmentUrls: normalized.slice(0, 3),
    };
  }

  /**
   * Get all conversations for the authenticated user
   * GET /api/messaging/conversations
   */
  @Get('conversations')
  async getConversations(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetConversationsQueryDto,
    @Req() rawReq: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    const versionHeader = String(rawReq?.headers?.['x-api-version'] ?? '').trim();
    const version = versionHeader === '2' ? '2' : '1';

    // Ensure caches/CDNs don't mix v1 and v2 shapes.
    res.setHeader('Vary', 'X-API-Version');
    res.setHeader('X-API-Version', version);

    const orgId = (req as any).org?.orgId as string | undefined;
    const result = await this.messagingService.getConversations(req.user.userId, query, orgId);

    // v1: preserve legacy client contract (bare array)
    if (version !== '2') {
      return result.conversations;
    }

    // v2: envelope with pagination metadata
    return {
      data: result.conversations,
      pagination: {
        page: result.pagination.page,
        limit: result.pagination.limit,
        totalItems: result.pagination.total,
        totalPages: result.pagination.pages,
      },
      meta: {
        serverTime: new Date().toISOString(),
      },
    };
  }

  /**
   * Create a new conversation
   * POST /api/messaging/conversations
   * Body: { participantIds: [1, 2, 3], initialMessage?: "Hello!" }
   */
  @Post('conversations')
  @HttpCode(HttpStatus.CREATED)
  async createConversation(
    @Body() dto: CreateConversationDto,
    @Request() req: AuthenticatedRequest,
    @OrgIdOptional() orgId?: string,
  ) {
    const conversation = await this.messagingService.createConversation(dto, req.user.userId, orgId);
    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'MESSAGING',
      action: 'CONVERSATION_CREATED',
      entityType: 'Conversation',
      entityId: conversation.id,
      result: 'SUCCESS',
      metadata: { participantCount: dto.participantIds.length },
    });
    return conversation;
  }

  /**
   * Start a new message thread (conversation + first message atomically)
   * POST /api/messaging/threads
   */
  @Post('threads')
  @HttpCode(HttpStatus.CREATED)
  async createThread(
    @Body() dto: CreateThreadDto,
    @Request() req: AuthenticatedRequest,
    @OrgIdOptional() orgId?: string,
  ) {
    const thread = await this.messagingService.createThread(dto, req.user.userId, orgId);

    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'MESSAGING',
      action: 'CONVERSATION_CREATED',
      entityType: 'Conversation',
      entityId: thread.id,
      result: 'SUCCESS',
      metadata: {
        participantCount: thread.participants?.length ?? 0,
        hasSubject: Boolean(dto.subject?.trim()),
      },
    });

    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'MESSAGING',
      action: 'MESSAGE_SENT',
      entityType: 'Message',
      entityId: thread.initialMessage.id,
      result: 'SUCCESS',
      metadata: {
        conversationId: thread.id,
        ...this.attachmentAuditMetadata(dto.attachmentUrls),
      },
    });

    return thread;
  }

  @Get('conversations/:id')
  async getConversation(
    @Param('id', ParseIntPipe) conversationId: number,
    @Request() req: AuthenticatedRequest,
    @OrgIdOptional() orgId?: string,
  ) {
    return this.messagingService.getConversationById(conversationId, req.user.userId, orgId);
  }

  /**
   * Get messages in a specific conversation
   * GET /api/messaging/conversations/:id/messages
   */
  @Get('conversations/:id/messages')
  async getConversationMessages(
    @Param('id', ParseIntPipe) conversationId: number,
    @Request() req: AuthenticatedRequest,
    @Query() query: GetMessagesQueryDto,
    @OrgIdOptional() orgId?: string,
  ) {
    const result = await this.messagingService.getConversationMessages(
      conversationId,
      req.user.userId,
      query,
      orgId,
    );
    return result.messages;
  }

  /**
   * Convenience endpoint for posting directly to a conversation
   */
  @Post('conversations/:id/messages')
  @HttpCode(HttpStatus.CREATED)
  async sendConversationMessage(
    @Param('id', ParseIntPipe) conversationId: number,
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateMessageDto,
    @OrgIdOptional() orgId?: string,
  ) {
    const message = await this.messagingService.sendMessage(
      { ...dto, conversationId },
      req.user.userId,
      orgId,
    );
    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'MESSAGING',
      action: 'MESSAGE_SENT',
      entityType: 'Message',
      entityId: message.id,
      result: 'SUCCESS',
      metadata: {
        conversationId: message.conversationId,
        ...this.attachmentAuditMetadata(dto.attachmentUrls),
      },
    });
    return message;
  }

  /**
   * Send a message (to existing conversation or create new one)
   * POST /api/messaging/messages
   * Body: { content: "Hello", conversationId?: 1, recipientId?: 2 }
   */
  @Post('messages')
  @HttpCode(HttpStatus.CREATED)
  async sendMessage(
    @Body() dto: CreateMessageDto,
    @Request() req: AuthenticatedRequest,
    @OrgIdOptional() orgId?: string,
  ) {
    const message = await this.messagingService.sendMessage(dto, req.user.userId, orgId);
    await this.auditLogService.record({
      orgId,
      actorId: req.user.userId,
      module: 'MESSAGING',
      action: 'MESSAGE_SENT',
      entityType: 'Message',
      entityId: message.id,
      result: 'SUCCESS',
      metadata: {
        conversationId: message.conversationId,
        ...this.attachmentAuditMetadata(dto.attachmentUrls),
      },
    });
    return message;
  }

  /**
   * Get available property managers (for tenants to initiate conversations)
   * GET /api/messaging/property-managers
   */
  @Get('property-managers')
  async getPropertyManagers(@OrgIdOptional() orgId?: string) {
    return this.messagingService.findPropertyManagers(orgId);
  }

  /**
   * Get all tenants (for property managers to initiate conversations)
   * GET /api/messaging/tenants
   */
  @Get('tenants')
  @UseGuards(RolesGuard)
  @Roles('PROPERTY_MANAGER')
  async getTenants(@OrgIdOptional() orgId?: string) {
    return this.messagingService.findAllTenants(orgId);
  }

  /**
   * Get all users (admin only - for managing conversations)
   * GET /api/messaging/users
   */
  @Get('users')
  @UseGuards(RolesGuard)
  @Roles('PROPERTY_MANAGER')
  async getAllUsers(@OrgIdOptional() orgId?: string) {
    return this.messagingService.findAllUsers(orgId);
  }

  /**
   * List available templates for bulk messaging
   */
  @Get('templates')
  @UseGuards(RolesGuard)
  @Roles('PROPERTY_MANAGER')
  async getTemplates() {
    return this.bulkMessagingService.getTemplates();
  }

  /**
   * Preview a bulk message before queuing it
   */
  @Post('bulk/preview')
  @UseGuards(RolesGuard)
  @Roles('PROPERTY_MANAGER')
  async previewBulk(
    @Body() dto: CreateBulkMessageDto,
    @Request() req: AuthenticatedRequest,
    @OrgIdOptional() orgId?: string,
  ) {
    return this.bulkMessagingService.previewBulkMessage(dto, req.user.userId, orgId);
  }

  /**
   * Queue a bulk message for asynchronous delivery
   */
  @Post('bulk')
  @HttpCode(HttpStatus.ACCEPTED)
  @UseGuards(RolesGuard)
  @Roles('PROPERTY_MANAGER')
  async queueBulk(
    @Body() dto: CreateBulkMessageDto,
    @Request() req: AuthenticatedRequest,
    @OrgIdOptional() orgId?: string,
  ) {
    return this.bulkMessagingService.queueBulkMessage(dto, req.user.userId, orgId);
  }

  /**
   * Get all bulk message batches with delivery summaries
   */
  @Get('bulk')
  @UseGuards(RolesGuard)
  @Roles('PROPERTY_MANAGER')
  async listBulkBatches(@OrgIdOptional() orgId?: string) {
    return this.bulkMessagingService.listBatches(orgId);
  }

  /**
   * Get metadata and delivery stats for a specific bulk batch
   */
  @Get('bulk/:id')
  @UseGuards(RolesGuard)
  @Roles('PROPERTY_MANAGER')
  async getBulkBatch(@Param('id', ParseIntPipe) id: number, @OrgIdOptional() orgId?: string) {
    return this.bulkMessagingService.getBatchById(id, orgId);
  }

  /**
   * Get the per-recipient delivery statuses for a bulk batch
   */
  @Get('bulk/:id/recipients')
  @UseGuards(RolesGuard)
  @Roles('PROPERTY_MANAGER')
  async getBulkRecipients(@Param('id', ParseIntPipe) id: number, @OrgIdOptional() orgId?: string) {
    return this.bulkMessagingService.getRecipientStatuses(id, orgId);
  }

  /**
   * Get summarized delivery report for a batch
   */
  @Get('bulk/:id/report')
  @UseGuards(RolesGuard)
  @Roles('PROPERTY_MANAGER')
  async getBulkReport(@Param('id', ParseIntPipe) id: number, @OrgIdOptional() orgId?: string) {
    return this.bulkMessagingService.getDeliveryReport(id, orgId);
  }

  /**
   * Get all conversations (property manager view - can see all)
   * GET /api/messaging/admin/conversations
   */
  @Get('admin/conversations')
  @UseGuards(RolesGuard)
  @Roles('PROPERTY_MANAGER')
  async getAllConversations(@Query() query: GetConversationsQueryDto, @OrgIdOptional() orgId?: string) {
    return this.messagingService.getAllConversations(query, orgId);
  }

  /**
   * Search conversations by username
   * GET /api/messaging/search?q=username
   */
  @Get('search')
  async searchConversations(
    @Query('q') searchTerm: string,
    @Request() req: AuthenticatedRequest,
    @OrgIdOptional() orgId?: string,
  ) {
    // Property managers can search all, tenants only their own
    const userId = req.user.role === 'PROPERTY_MANAGER' ? undefined : req.user.userId;
    return this.messagingService.searchConversations(searchTerm, userId, orgId);
  }

  /**
   * Get conversation statistics (property manager only)
   * GET /api/messaging/stats
   */
  @Get('stats')
  @UseGuards(RolesGuard)
  @Roles('PROPERTY_MANAGER')
  async getStats(@OrgIdOptional() orgId?: string) {
    return this.messagingService.getConversationStats(orgId);
  }
}
