import { Body, Controller, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { Role } from '@prisma/client';
import { ListingSyndicationService } from './listing-syndication.service';
import { SyndicationActionDto } from './dto/syndication-action.dto';
import { UpsertChannelCredentialDto } from './dto/channel-credential.dto';

@Controller('api/listings/syndication')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@Roles(Role.PROPERTY_MANAGER)
export class ListingSyndicationController {
  constructor(private readonly listingSyndicationService: ListingSyndicationService) {}

  @Post(':propertyId/trigger')
  triggerSyndication(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: SyndicationActionDto,
    @OrgId() orgId?: string,
  ) {
    return this.listingSyndicationService.queueSyndication(propertyId, dto, orgId);
  }

  @Post(':propertyId/pause')
  pauseSyndication(
    @Param('propertyId', ParseUUIDPipe) propertyId: string,
    @Body() dto: SyndicationActionDto,
    @OrgId() orgId?: string,
  ) {
    return this.listingSyndicationService.pauseSyndication(propertyId, dto, orgId);
  }

  @Get(':propertyId/status')
  getStatus(@Param('propertyId', ParseUUIDPipe) propertyId: string, @OrgId() orgId?: string) {
    return this.listingSyndicationService.getPropertyStatus(propertyId, orgId);
  }

  @Get('credentials/all')
  listCredentials(@OrgId() orgId?: string) {
    return this.listingSyndicationService.listChannelCredentials(orgId);
  }

  @Post('credentials')
  upsertCredential(@Body() dto: UpsertChannelCredentialDto, @OrgId() orgId?: string) {
    return this.listingSyndicationService.upsertChannelCredential(dto, orgId);
  }
}
