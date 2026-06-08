import { Body, Controller, Get, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Role } from '@prisma/client';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { CreatePropertyDto, CreateUnitDto, UpdatePropertyDto, UpdateUnitDto } from '../property/dto/property.dto';
import { OperatorSetupService } from './operator-setup.service';

type AuthenticatedRequest = Request & {
  user: {
    userId: string;
    role: Role;
  };
};

@Controller('operator-setup')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@UseApiEnvelope()
export class OperatorSetupController {
  constructor(private readonly setupService: OperatorSetupService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Operator property and unit setup summary') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getSummary(@OrgId() orgId: string) {
    return this.setupService.getSummary(orgId);
  }

  @Post('properties')
  @ApiCreatedResponse({ schema: envelopeSchema('Created property') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  createProperty(@OrgId() orgId: string, @Request() req: AuthenticatedRequest, @Body() dto: CreatePropertyDto) {
    return this.setupService.createProperty(orgId, req.user.userId, dto);
  }

  @Patch('properties/:propertyId')
  @ApiOkResponse({ schema: envelopeSchema('Updated property') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  updateProperty(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('propertyId') propertyId: string,
    @Body() dto: UpdatePropertyDto,
  ) {
    return this.setupService.updateProperty(orgId, req.user.userId, propertyId, dto);
  }

  @Post('properties/:propertyId/units')
  @ApiCreatedResponse({ schema: envelopeSchema('Created unit') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  createUnit(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('propertyId') propertyId: string,
    @Body() dto: CreateUnitDto,
  ) {
    return this.setupService.createUnit(orgId, req.user.userId, propertyId, dto);
  }

  @Patch('properties/:propertyId/units/:unitId')
  @ApiOkResponse({ schema: envelopeSchema('Updated unit') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  updateUnit(
    @OrgId() orgId: string,
    @Request() req: AuthenticatedRequest,
    @Param('propertyId') propertyId: string,
    @Param('unitId') unitId: string,
    @Body() dto: UpdateUnitDto,
  ) {
    return this.setupService.updateUnit(orgId, req.user.userId, propertyId, unitId, dto);
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
