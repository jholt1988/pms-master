import { Body, Controller, Get, HttpCode, Param, Post, Query, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import {
  CreateConversationDto,
  CreateMessageDto,
  GetConversationsQueryDto,
  GetMessagesQueryDto,
} from '../messaging/dto/messaging.dto';
import { OperatorMessagingService } from './operator-messaging.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    username?: string;
    role: Role;
  };
};

@Controller('operator-messaging')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorMessagingController {
  constructor(private readonly messagingService: OperatorMessagingService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator messaging workbench summary') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(@OrgId() orgId: string) {
    return this.messagingService.getWorkbench(orgId);
  }

  @Get('conversations')
  @ApiOkResponse({ schema: envelopeSchema('Operator conversations list') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getConversations(@OrgId() orgId: string, @Query() query: GetConversationsQueryDto) {
    return this.messagingService.getConversations(query, orgId);
  }

  @Post('conversations')
  @HttpCode(201)
  @ApiCreatedResponse({ schema: envelopeSchema('Created conversation') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  createConversation(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Body() dto: CreateConversationDto,
  ) {
    return this.messagingService.createConversation(dto, req.user.userId, orgId);
  }

  @Get('conversations/:id/messages')
  @ApiOkResponse({ schema: envelopeSchema('Conversation messages') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getConversationMessages(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('id') conversationId: number,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.messagingService.getConversationMessages(conversationId, req.user.userId, query, orgId);
  }

  @Post('conversations/:id/messages')
  @HttpCode(201)
  @ApiCreatedResponse({ schema: envelopeSchema('Sent message') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  sendConversationMessage(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('id') conversationId: number,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagingService.sendMessage(
      { ...dto, conversationId },
      req.user.userId,
      orgId,
    );
  }
}

function envelopeSchema(description: string) {
  return {
    type: 'object',
    description,
    required: ['data', 'meta', 'errors'],
    properties: {
      data: { type: 'object', additionalProperties: true },
      meta: { type: 'object', additionalProperties: true },
      errors: { type: 'array', items: { type: 'object', additionalProperties: true } },
    },
  };
}
