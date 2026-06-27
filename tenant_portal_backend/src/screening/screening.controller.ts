import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { ScreeningService } from './screening.service';

/**
 * Screening API — tenant screening endpoints.
 *
 * Works alongside the existing ScreeningRadialController
 * (POST /screening/:id/decision) by adding the initiate + report flow.
 */
@Controller('screening')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ScreeningController {
  constructor(private readonly screeningService: ScreeningService) {}

  /**
   * Initiate a screening request for a rental application.
   * Triggers an external provider check (stub in dev/CI).
   */
  @Post('applications/:id/request')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async requestScreening(@Param('id') id: string) {
    const applicationId = parseInt(id, 10);
    if (isNaN(applicationId)) {
      throw new NotFoundException('Invalid application ID');
    }

    const { requestId } =
      await this.screeningService.requestScreening(applicationId);
    return { requestId, applicationId, status: 'REQUESTED' };
  }

  /**
   * Get the latest screening result for an application.
   */
  @Get('applications/:id/report')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getReport(@Param('id') id: string) {
    const applicationId = parseInt(id, 10);
    if (isNaN(applicationId)) {
      throw new NotFoundException('Invalid application ID');
    }

    const result =
      await this.screeningService.getLatestForApplication(applicationId);
    if (!result) {
      throw new NotFoundException('No screening found for this application');
    }

    return result;
  }

  /**
   * Provider webhook — receives screening results from external providers.
   * Public endpoint (provider calls back to us without JWT).
   * Secured by provider-specific signature verification in production.
   */
  @Public()
  @Post('webhook/:provider')
  async providerWebhook(
    @Param('provider') provider: string,
    @Body() payload: { externalId: string; result: any },
  ) {
    // In production, validate provider-specific webhook signature here
    // e.g. HMAC header verification for TransUnion, etc.

    await this.screeningService.processResult(
      payload.externalId,
      payload.result,
    );

    return { received: true };
  }
}
