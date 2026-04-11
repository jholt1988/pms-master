import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationChannel, CommunicationDirection } from '@prisma/client';

@Injectable()
export class OmnichannelService {
  private readonly logger = new Logger(OmnichannelService.name);

  constructor(private readonly prisma: PrismaService) {}

  async createThread(tenantId: string | undefined, title: string, priority: string = 'NORMAL') {
    return this.prisma.omnichannelThread.create({
      data: {
        tenantId,
        title,
        priority,
      },
    });
  }

  async getThreads(tenantId?: string) {
    return this.prisma.omnichannelThread.findMany({
      where: tenantId ? { tenantId } : undefined,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Get the latest message for preview
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async getThreadMessages(threadId: string) {
    return this.prisma.communicationLog.findMany({
      where: { threadId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async sendMessage(
    threadId: string,
    channel: CommunicationChannel,
    direction: CommunicationDirection,
    to: string,
    from: string,
    message: string,
    metadata?: any
  ) {
    const log = await this.prisma.communicationLog.create({
      data: {
        threadId,
        channel,
        direction,
        to,
        from,
        message,
        metadata: metadata || {},
      },
    });

    // Update thread's updatedAt to bubble it up in the inbox
    await this.prisma.omnichannelThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date() },
    });

    // In a real implementation, you would emit a WebSocket event here or integrate with Twilio/SendGrid
    this.logger.log(`Message sent on thread ${threadId} via ${channel}`);

    return log;
  }
}
