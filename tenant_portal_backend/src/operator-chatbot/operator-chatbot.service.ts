import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OperatorChatbotService {
  private readonly logger = new Logger(OperatorChatbotService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getWorkbench(orgId: string) {
    const users = await this.prisma.user.findMany({
      where: { organizations: { some: { id: orgId } } },
      select: { id: true, firstName: true, lastName: true, username: true },
    });
    const userIds = users.map((u) => u.id);

    const workflowExecutions = await this.prisma.workflowExecution.findMany({
      where: {
        workflowId: { contains: 'chatbot' },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    const recentInteractions = workflowExecutions.filter(
      (w) => w.input && typeof w.input === 'object' && 'userId' in (w.input as any) && userIds.includes((w.input as any).userId),
    );

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        totalUsers: users.length,
        recentSessions: recentInteractions.length,
        activeSessions: recentInteractions.filter((w) => w.status === 'RUNNING').length,
        completedSessions: recentInteractions.filter((w) => w.status === 'COMPLETED').length,
        failedSessions: recentInteractions.filter((w) => w.status === 'FAILED').length,
      },
      recentSessions: recentInteractions.slice(0, 20),
    };
  }

  async sendMessage(orgId: string, userId: string, message: string, sessionId?: string) {
    const session = sessionId || `op-session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    await this.prisma.workflowExecution.create({
      data: {
        workflowId: 'chatbot.operator.message',
        status: 'COMPLETED',
        input: { userId, message, sessionId: session, orgId },
        output: {
          response: 'Message received by operator chatbot service.',
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      message: 'Message received by operator chatbot service.',
      sessionId: session,
      confidence: 0.9,
    };
  }

  async getSessionHistory(orgId: string, sessionId: string, userId: string) {
    const executions = await this.prisma.workflowExecution.findMany({
      where: {
        workflowId: 'chatbot.operator.message',
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return executions.filter(
      (e) => e.input && typeof e.input === 'object' && (e.input as any).sessionId === sessionId,
    );
  }
}
