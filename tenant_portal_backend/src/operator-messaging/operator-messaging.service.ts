import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from '../messaging/messaging.service';
import { CreateConversationDto, GetConversationsQueryDto, GetMessagesQueryDto, CreateMessageDto } from '../messaging/dto/messaging.dto';

export interface OperatorMessagingWorkbench {
  generatedAt: string;
  metrics: {
    totalConversations: number;
    totalMessages: number;
    activeConversations: number;
    unreadConversations: number;
    recentMessages: number;
  };
  conversations: any[];
  recentMessages: any[];
  sourceLinks: { label: string; href: string; entityType: string }[];
}

@Injectable()
export class OperatorMessagingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messagingService: MessagingService,
  ) {}

  /**
   * Workbench summary: conversations, unread counts, recent messages.
   */
  async getWorkbench(orgId: string): Promise<OperatorMessagingWorkbench> {
    const stats = await this.messagingService.getConversationStats(orgId);

    // Fetch recent conversations (limit 10) scoped to org
    const conversationsResult = await this.messagingService.getAllConversations(
      { page: 1, limit: 10 } as GetConversationsQueryDto,
      orgId,
    );

    // Fetch recent messages across org conversations (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentMessages = await this.prisma.message.findMany({
      where: {
        createdAt: { gte: sevenDaysAgo },
        conversation: {
          participants: {
            some: {
              user: { organizations: { some: { id: orgId } } },
            },
          },
        },
      },
      include: {
        sender: {
          select: { id: true, username: true, role: true },
        },
        conversation: {
          select: {
            id: true,
            subject: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        totalConversations: stats.totalConversations,
        totalMessages: stats.totalMessages,
        activeConversations: stats.activeConversations,
        unreadConversations: await this.computeUnreadConversations(orgId),
        recentMessages: recentMessages.length,
      },
      conversations: conversationsResult.conversations,
      recentMessages,
      sourceLinks: [
        {
          label: 'Canonical messaging API',
          href: '/api/messaging/conversations',
          entityType: 'Conversation',
        },
        {
          label: 'Operator messaging workbench',
          href: '/api/operator-messaging',
          entityType: 'Conversation',
        },
      ],
    };
  }

  /**
   * List conversations (org-wide operator view).
   */
  async getConversations(query: GetConversationsQueryDto, orgId: string) {
    return this.messagingService.getAllConversations(query, orgId);
  }

  /**
   * Create a new conversation.
   */
  async createConversation(dto: CreateConversationDto, creatorId: string, orgId: string) {
    return this.messagingService.createConversation(dto, creatorId, orgId);
  }

  /**
   * Get messages for a conversation.
   */
  async getConversationMessages(conversationId: number, userId: string, query: GetMessagesQueryDto, orgId: string) {
    return this.messagingService.getConversationMessages(conversationId, userId, query, orgId);
  }

  /**
   * Send a message to a conversation.
   */
  async sendMessage(dto: CreateMessageDto, senderId: string, orgId: string) {
    return this.messagingService.sendMessage(dto, senderId, orgId);
  }

  /**
   * Compute unread conversations: conversations where the most recent message
   * was sent by a tenant (non-org-member), indicating a pending operator reply.
   * There is no `isRead` column on Message/Conversation, so we use this proxy
   * until read-tracking is modelled.
   */
  private async computeUnreadConversations(orgId: string): Promise<number> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Find conversations in the last 7 days for this org
    const conversations = await this.prisma.conversation.findMany({
      where: {
        messages: { some: { createdAt: { gte: sevenDaysAgo } } },
        participants: {
          some: {
            user: { organizations: { some: { id: orgId } } },
          },
        },
      },
      select: {
        id: true,
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { senderId: true },
        },
      },
    });

    // Count conversations where the last message sender is NOT an org member
    const orgUserIds = new Set(
      (
        await this.prisma.user.findMany({
          where: { organizations: { some: { id: orgId } } },
          select: { id: true },
        })
      ).map((u) => u.id),
    );

    return conversations.filter(
      (c) => c.messages[0] && !orgUserIds.has(c.messages[0].senderId),
    ).length;
  }
}
