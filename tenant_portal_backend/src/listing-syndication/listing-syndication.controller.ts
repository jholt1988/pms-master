import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { Role } from '@prisma/client';
import { ListingSyndicationService } from './listing-syndication.service';
import { SyndicationActionDto } from './dto/syndication-action.dto';
import { UpsertChannelCredentialDto } from './dto/channel-credential.dto';

@Controller('api/listings/syndication')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.PROPERTY_MANAGER)
export class ListingSyndicationController {
  constructor(private readonly listingSyndicationService: ListingSyndicationService) {}

  @Post(':propertyId/trigger')
  triggerSyndication(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: SyndicationActionDto,
  ) {
    return this.listingSyndicationService.queueSyndication(propertyId, dto);
  }

  @Post(':propertyId/pause')
  pauseSyndication(
    @Param('propertyId', ParseIntPipe) propertyId: number,
    @Body() dto: SyndicationActionDto,
  ) {
    return this.listingSyndicationService.pauseSyndication(propertyId, dto);
  }

  @Get(':propertyId/status')
  getStatus(@Param('propertyId', ParseIntPipe) propertyId: number) {
    return this.listingSyndicationService.getPropertyStatus(propertyId);
  }

  @Get('credentials/all')
  listCredentials() {
    return this.listingSyndicationService.listChannelCredentials();
  }

  @Post('credentials')
  upsertCredential(@Body() dto: UpsertChannelCredentialDto) {
    return this.listingSyndicationService.upsertChannelCredential(dto);
  }
}
