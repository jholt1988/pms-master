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
        unreadConversations: 0, // placeholder — unread tracking not modelled yet
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
}
