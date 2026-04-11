import { Controller, Get, Post, Body, Param, UseGuards, Query } from '@nestjs/common';
import { OmnichannelService } from './omnichannel.service';
import { AuthGuard } from '@nestjs/passport';
import { CommunicationChannel, CommunicationDirection } from '@prisma/client';

@Controller('omnichannel')
@UseGuards(AuthGuard('jwt'))
export class OmnichannelController {
  constructor(private readonly omnichannelService: OmnichannelService) {}

  @Post('threads')
  async createThread(@Body() body: { tenantId?: string; title: string; priority?: string }) {
    return this.omnichannelService.createThread(body.tenantId, body.title, body.priority);
  }

  @Get('threads')
  async getThreads(@Query('tenantId') tenantId?: string) {
    return this.omnichannelService.getThreads(tenantId);
  }

  @Get('threads/:threadId/messages')
  async getThreadMessages(@Param('threadId') threadId: string) {
    return this.omnichannelService.getThreadMessages(threadId);
  }

  @Post('threads/:threadId/messages')
  async sendMessage(
    @Param('threadId') threadId: string,
    @Body() body: {
      channel: CommunicationChannel;
      direction: CommunicationDirection;
      to: string;
      from: string;
      message: string;
      metadata?: any;
    },
  ) {
    return this.omnichannelService.sendMessage(
      threadId,
      body.channel,
      body.direction,
      body.to,
      body.from,
      body.message,
      body.metadata,
    );
  }
}
