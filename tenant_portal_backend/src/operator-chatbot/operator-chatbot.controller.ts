import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OperatorChatbotService } from './operator-chatbot.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    role: Role;
  };
};

@Controller('operator-chatbot')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorChatbotController {
  constructor(private readonly service: OperatorChatbotService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator chatbot workbench') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(@OrgId() orgId: string) {
    return this.service.getWorkbench(orgId);
  }

  @Post('message')
  @ApiCreatedResponse({ schema: envelopeSchema('Chatbot message response') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  sendMessage(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Body() body: { message: string; sessionId?: string },
  ) {
    return this.service.sendMessage(orgId, req.user.userId, body.message, body.sessionId);
  }

  @Get('session/:sessionId')
  @ApiOkResponse({ schema: envelopeSchema('Chatbot session history') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getSessionHistory(
    @OrgId() orgId: string,
    @Param('sessionId') sessionId: string,
    @Request() req: AuthenticatedRequest,
  ) {
    return this.service.getSessionHistory(orgId, sessionId, req.user.userId);
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
