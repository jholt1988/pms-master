import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChatbotService } from '../chatbot/chatbot.service';

@Injectable()
export class OperatorChatbotService {
  private readonly logger = new Logger(OperatorChatbotService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatbotService: ChatbotService,
  ) {}

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
    // Delegate to the real ChatbotService which has AI/RAG/orchestrator integration.
    const response = await this.chatbotService.sendMessage(userId, message, sessionId);

    // Persist the interaction for workbench metrics.
    await this.prisma.workflowExecution.create({
      data: {
        workflowId: 'chatbot.operator.message',
        status: 'COMPLETED',
        input: { userId, message, sessionId: response.sessionId, orgId },
        output: {
          response: response.message,
          intent: response.intent,
          confidence: response.confidence,
          timestamp: new Date().toISOString(),
        },
      },
    });

    return {
      message: response.message,
      sessionId: response.sessionId,
      confidence: response.confidence ?? 0.85,
      intent: response.intent,
      suggestedActions: response.suggestedActions,
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
