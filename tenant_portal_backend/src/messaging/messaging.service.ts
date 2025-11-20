import { ForbiddenException, Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto, CreateConversationDto, GetConversationsQueryDto, GetMessagesQueryDto } from './dto/messaging.dto';

@Injectable()
export class MessagingService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all conversations for a user with pagination
   */
  async getConversations(userId: number, query?: GetConversationsQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { participants: { some: { userId } } },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count({
        where: { participants: { some: { userId } } },
      }),
    ]);

    return {
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single conversation by ID
   */
  async getConversationById(conversationId: number, userId: number) {
    await this.ensureConversationParticipant(conversationId, userId);

    return this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
        },
        messages: {
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  /**
   * Get messages in a conversation with pagination
   */
  async getConversationMessages(conversationId: number, userId: number, query?: GetMessagesQueryDto) {
    await this.ensureConversationParticipant(conversationId, userId);

    const page = query?.page || 1;
    const limit = query?.limit || 50;
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.prisma.message.findMany({
        where: { conversationId },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.message.count({
        where: { conversationId },
      }),
    ]);

    return {
      messages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Create a new conversation with initial participants
   */
  async createConversation(dto: CreateConversationDto, creatorId: number) {
    // Add creator to participants if not already included
    const participantIds = dto.participantIds.includes(creatorId)
      ? dto.participantIds
      : [...dto.participantIds, creatorId];

    // Verify all participants exist
    const users = await this.prisma.user.findMany({
      where: { id: { in: participantIds } },
    });

    if (users.length !== participantIds.length) {
      throw new BadRequestException('One or more participants not found');
    }

    return this.prisma.$transaction(async (prisma) => {
      const conversation = await prisma.conversation.create({
        data: {
          participants: {
            create: participantIds.map((userId) => ({ userId })),
          },
        },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                },
              },
            },
          },
        },
      });

      // If initial message provided, create it
      if (dto.initialMessage) {
        await prisma.message.create({
          data: {
            content: dto.initialMessage,
            senderId: creatorId,
            conversationId: conversation.id,
          },
        });
      }

      return conversation;
    });
  }

  /**
   * Send a message (create new conversation if needed)
   */
  async sendMessage(dto: CreateMessageDto, senderId: number) {
    // If conversationId provided, use existing conversation
    if (dto.conversationId) {
      await this.ensureConversationParticipant(dto.conversationId, senderId);
      
      return this.prisma.message.create({
        data: {
          senderId,
          conversationId: dto.conversationId,
          content: dto.content,
        },
        include: {
          sender: {
            select: {
              id: true,
              username: true,
              role: true,
            },
          },
        },
      });
    }

    // If recipientId provided, find or create conversation
    if (dto.recipientId) {
      if (dto.recipientId === senderId) {
        throw new BadRequestException('Cannot send message to yourself');
      }

      // Check if recipient exists
      const recipient = await this.prisma.user.findUnique({
        where: { id: dto.recipientId },
      });

      if (!recipient) {
        throw new NotFoundException('Recipient not found');
      }

      // Find existing conversation between these users
      const existingConversation = await this.findConversationBetweenUsers(senderId, dto.recipientId);

      if (existingConversation) {
        return this.prisma.message.create({
          data: {
            senderId,
            conversationId: existingConversation.id,
            content: dto.content,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
        });
      }

      // Create new conversation
      return this.prisma.$transaction(async (prisma) => {
        const conversation = await prisma.conversation.create({
          data: {
            participants: {
              create: [{ userId: senderId }, { userId: dto.recipientId }],
            },
          },
        });

        return prisma.message.create({
          data: {
            senderId,
            conversationId: conversation.id,
            content: dto.content,
          },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
        });
      });
    }

    throw new BadRequestException('Either conversationId or recipientId must be provided');
  }

  /**
   * Find property managers (users with PROPERTY_MANAGER role)
   */
  async findPropertyManagers() {
    return this.prisma.user.findMany({
      where: { role: 'PROPERTY_MANAGER' },
      select: {
        id: true,
        username: true,
        role: true,
      },
    });
  }

  /**
   * Get all tenants (for property managers to initiate conversations)
   */
  async findAllTenants() {
    return this.prisma.user.findMany({
      where: { role: 'TENANT' },
      select: {
        id: true,
        username: true,
        role: true,
        lease: {
          select: {
            id: true,
            unit: {
              select: {
                id: true,
                name: true,
                property: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Get all users (admin only - for viewing all conversations)
   */
  async findAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        role: true,
      },
      orderBy: { username: 'asc' },
    });
  }

  /**
   * Get all conversations (admin only - for monitoring)
   */
  async getAllConversations(query?: GetConversationsQueryDto) {
    const page = query?.page || 1;
    const limit = query?.limit || 20;
    const skip = (page - 1) * limit;

    const [conversations, total] = await Promise.all([
      this.prisma.conversation.findMany({
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                },
              },
            },
          },
          messages: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: {
              sender: {
                select: {
                  id: true,
                  username: true,
                  role: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.conversation.count(),
    ]);

    return {
      conversations,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Search conversations by username (for property managers/admins)
   */
  async searchConversations(searchTerm: string, userId?: number) {
    const whereClause: any = {
      participants: {
        some: {
          user: {
            username: {
              contains: searchTerm,
              mode: 'insensitive',
            },
          },
        },
      },
    };

    // If userId provided, filter to only user's conversations
    if (userId) {
      whereClause.participants.some.userId = userId;
    }

    return this.prisma.conversation.findMany({
      where: whereClause,
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
        },
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
          include: {
            sender: {
              select: {
                id: true,
                username: true,
                role: true,
              },
            },
          },
        },
      },
      take: 20,
    });
  }

  /**
   * Get conversation statistics (admin only)
   */
  async getConversationStats() {
    const [
      totalConversations,
      totalMessages,
      activeConversations,
      conversationsByRole,
    ] = await Promise.all([
      this.prisma.conversation.count(),
      this.prisma.message.count(),
      this.prisma.conversation.count({
        where: {
          messages: {
            some: {
              createdAt: {
                gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
              },
            },
          },
        },
      }),
      this.prisma.user.groupBy({
        by: ['role'],
        _count: {
          id: true,
        },
      }),
    ]);

    return {
      totalConversations,
      totalMessages,
      activeConversations,
      conversationsByRole,
      averageMessagesPerConversation: totalConversations > 0 
        ? Math.round(totalMessages / totalConversations) 
        : 0,
    };
  }

  /**
   * Find existing conversation between two users
   */
  private async findConversationBetweenUsers(userId1: number, userId2: number) {
    const conversations = await this.prisma.conversation.findMany({
      where: {
        participants: {
          every: {
            userId: { in: [userId1, userId2] },
          },
        },
      },
      include: {
        participants: true,
      },
    });

    // Find conversation with exactly these two participants
    return conversations.find(
      (conv) =>
        conv.participants.length === 2 &&
        conv.participants.some((p) => p.userId === userId1) &&
        conv.participants.some((p) => p.userId === userId2),
    );
  }

  private async ensureConversationParticipant(conversationId: number, userId: number) {
    const conversation = await this.prisma.conversation.findFirst({
      where: {
        id: conversationId,
        participants: {
          some: { userId },
        },
      },
    });

    if (!conversation) {
      throw new ForbiddenException('You do not have access to this conversation');
    }
  }
}
