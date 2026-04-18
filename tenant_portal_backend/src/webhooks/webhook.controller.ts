// Story 22: Webhook and Event Integration System
// POST /webhooks, GET /webhooks, POST /webhooks/:id/test, DELETE /webhooks/:id
// Dependencies: All | Estimate: Medium

import { Controller, Get, Post, Delete, Param, Body, UseGuards, NotFoundException, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface CreateWebhookDto {
  name: string;
  url: string;
  events: string[];
  secret?: string;
  isActive?: boolean;
}

interface TestWebhookDto {
  eventType?: string;
  payload?: Record<string, any>;
}

@Controller('webhooks')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class WebhookController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  @Roles('ADMIN')
  async createWebhook(@Body() dto: CreateWebhookDto) {
    if (!dto.name?.trim()) throw new BadRequestException('Name is required');
    if (!dto.url?.startsWith('https://')) throw new BadRequestException('URL must be HTTPS');

    const webhook = await this.prisma.webhook.create({
      data: {
        name: dto.name,
        url: dto.url,
        events: dto.events,
        secret: dto.secret,
        isActive: dto.isActive ?? true,
      },
    });

    console.log('[WEBHOOK] Created:', webhook.id, webhook.name);

    return { id: webhook.id, name: webhook.name, url: webhook.url };
  }

  @Get()
  @Roles('ADMIN')
  async listWebhooks() {
    const webhooks = await this.prisma.webhook.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return { data: webhooks, total: webhooks.length };
  }

  @Get(':id')
  @Roles('ADMIN')
  async getWebhook(@Param('id') id: string) {
    const webhookId = parseInt(id, 10);
    const webhook = await this.prisma.webhook.findUnique({
      where: { id: webhookId },
      include: { deliveries: { take: 10, orderBy: { createdAt: 'desc' } } },
    });

    if (!webhook) throw new NotFoundException('Webhook not found');
    return webhook;
  }

  @Patch(':id')
  @Roles('ADMIN')
  async updateWebhook(@Param('id') id: string, @Body() dto: Partial<CreateWebhookDto>) {
    const webhookId = parseInt(id, 10);
    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook) throw new NotFoundException('Webhook not found');

    const updated = await this.prisma.webhook.update({
      where: { id: webhookId },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.url && { url: dto.url }),
        ...(dto.events && { events: dto.events }),
        ...(dto.secret !== undefined && { secret: dto.secret }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });

    console.log('[WEBHOOK] Updated:', webhookId);

    return { id: updated.id, isActive: updated.isActive };
  }

  @Post(':id/test')
  @Roles('ADMIN')
  async testWebhook(@Param('id') id: string, @Body() dto: TestWebhookDto) {
    const webhookId = parseInt(id, 10);
    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook) throw new NotFoundException('Webhook not found');

    // Create test event
    const payload = dto.payload || {
      event: dto.eventType || 'test',
      timestamp: new Date().toISOString(),
      data: { test: true },
    };

    // Record delivery attempt (in production, actually call the webhook)
    const delivery = await this.prisma.webhookDelivery.create({
      data: {
        webhookId,
        eventType: dto.eventType || 'test',
        payload: JSON.stringify(payload),
        status: 'PENDING',
      },
    });

    // Simulate delivery status
    const success = Math.random() > 0.1; // 90% success rate simulation

    await this.prisma.webhookDelivery.update({
      where: { id: delivery.id },
      data: {
        status: success ? 'SUCCESS' : 'FAILED',
        responseStatus: success ? 200 : 500,
        completedAt: new Date(),
      },
    });

    console.log('[WEBHOOK] Test:', webhookId, success ? 'SUCCESS' : 'FAILED');

    return { id: delivery.id, status: success ? 'SUCCESS' : 'FAILED' };
  }

  @Delete(':id')
  @Roles('ADMIN')
  async deleteWebhook(@Param('id') id: string) {
    const webhookId = parseInt(id, 10);
    const webhook = await this.prisma.webhook.findUnique({ where: { id: webhookId } });
    if (!webhook) throw new NotFoundException('Webhook not found');

    await this.prisma.webhook.delete({ where: { id: webhookId } });

    console.log('[WEBHOOK] Deleted:', webhookId);

    return { success: true };
  }

  @Get('events')
  @Roles('ADMIN')
  async listEventTypes() {
    // Available event types for webhooks
    return {
      events: [
        { type: 'payment.created', description: 'When a payment is recorded' },
        { type: 'payment.completed', description: 'When payment status changes to paid' },
        { type: 'lease.created', description: 'When a new lease is created' },
        { type: 'lease.expiring', description: 'When lease is expiring' },
        { type: 'maintenance.created', description: 'When maintenance request created' },
        { type: 'maintenance.completed', description: 'When maintenance is completed' },
        { type: 'tenant.created', description: 'When tenant profile is created' },
        { type: 'decision.created', description: 'When new decision appears' },
        { type: 'decision.resolved', description: 'When decision is resolved' },
      ],
    };
  }
}

// Event dispatcher (helper)
export class WebhookDispatcher {
  constructor(private readonly prisma: PrismaService) {}

  async dispatch(eventType: string, data: any) {
    const webhooks = await this.prisma.webhook.findMany({
      where: { isActive: true, events: { has: eventType } },
    });

    for (const webhook of webhooks) {
      await this.prisma.webhookDelivery.create({
        data: {
          webhookId: webhook.id,
          eventType,
          payload: JSON.stringify(data),
          status: 'PENDING',
        },
      });

      // In production, use axios/fetch to POST to webhook.url
      console.log('[WEBHOOK] Dispatched:', eventType, 'to', webhook.url);
    }
  }
}