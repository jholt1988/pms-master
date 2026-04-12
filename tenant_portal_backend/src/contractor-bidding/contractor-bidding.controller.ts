import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { ContractorBiddingService } from './contractor-bidding.service';

@Controller('contractor-bidding')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@Roles('PROPERTY_MANAGER', 'ADMIN')
export class ContractorBiddingController {
  constructor(private readonly biddingService: ContractorBiddingService) {}

  @Post('bids')
  createBid(@OrgId() orgId: string, @Body() dto: any) {
    return this.biddingService.createBid(orgId, dto);
  }

  @Get('bids')
  listBids(
    @OrgId() orgId: string,
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: string,
  ) {
    return this.biddingService.listBids(orgId, { propertyId, status });
  }

  @Get('bids/:id')
  getBid(@OrgId() orgId: string, @Param('id') id: string) {
    return this.biddingService.getBid(orgId, id);
  }

  @Patch('bids/:id/award')
  awardBid(@OrgId() orgId: string, @Param('id') id: string) {
    return this.biddingService.awardBid(orgId, id);
  }

  @Patch('bids/:id/reject')
  rejectBid(@OrgId() orgId: string, @Param('id') id: string) {
    return this.biddingService.rejectBid(orgId, id);
  }

  @Post('bids/:id/ai-score')
  scoreBid(@OrgId() orgId: string, @Param('id') id: string) {
    return this.biddingService.aiScoreBid(orgId, id);
  }

  @Get('properties/:propertyId/recommendations')
  getRecommendations(
    @OrgId() orgId: string,
    @Param('propertyId') propertyId: string,
    @Query('scope') scope: string,
  ) {
    return this.biddingService.getContractorRecommendations(orgId, propertyId, scope);
  }
}
