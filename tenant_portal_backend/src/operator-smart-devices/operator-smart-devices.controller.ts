import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse } from '@nestjs/swagger';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UseApiEnvelope } from '../common/envelope/envelope.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OperatorSmartDevicesService } from './operator-smart-devices.service';

@Controller('operator-smart-devices')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@UseApiEnvelope()
export class OperatorSmartDevicesController {
  constructor(private readonly devicesService: OperatorSmartDevicesService) {}

  @Get()
  @ApiOkResponse({ schema: envelopeSchema('Smart devices workbench summary') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getWorkbench(
    @OrgId() orgId: string,
    @Query('propertyId') propertyId?: string,
    @Query('unitId') unitId?: string,
  ) {
    return this.devicesService.getWorkbench(orgId, propertyId, unitId);
  }

  @Post()
  @ApiCreatedResponse({ schema: envelopeSchema('Device registered') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  registerDevice(@OrgId() orgId: string, @Body() body: any) {
    return this.devicesService.registerDevice(orgId, body);
  }

  @Post(':deviceId/access-codes')
  @ApiCreatedResponse({ schema: envelopeSchema('Access code created') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  createAccessCode(
    @OrgId() orgId: string,
    @Param('deviceId') deviceId: string,
    @Body() body: any,
  ) {
    return this.devicesService.createAccessCode(orgId, deviceId, body);
  }

  @Get(':deviceId/access-codes')
  @ApiOkResponse({ schema: envelopeSchema('Access codes for device') })
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  getAccessCodes(
    @OrgId() orgId: string,
    @Param('deviceId') deviceId: string,
  ) {
    return this.devicesService.getAccessCodes(deviceId, orgId);
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
