/**
 * Lead Applications Controller
 * API endpoints for rental application management
 */

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { LeadApplicationsService } from './lead-applications.service';

@Controller('api/applications')
export class LeadApplicationsController {
  constructor(
    private readonly leadApplicationsService: LeadApplicationsService,
  ) {}

  /**
   * Submit a rental application
   * POST /api/applications/submit
   */
  @Post('submit')
  async submitApplication(@Body() body: any) {
    try {
      const application = await this.leadApplicationsService.submitApplication(
        body,
      );

      return {
        success: true,
        applicationId: application.id,
        message:
          "Application submitted successfully! We'll review it within 24-48 hours and contact you with next steps.",
        application,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to submit application',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get application by ID
   * GET /api/applications/:id
   */
  @Get(':id')
  async getApplicationById(@Param('id') id: string) {
    try {
      const application = await this.leadApplicationsService.getApplicationById(
        id,
      );

      if (!application) {
        throw new HttpException('Application not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        application,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to fetch application',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get applications for a lead
   * GET /api/applications/lead/:leadId
   */
  @Get('lead/:leadId')
  async getApplicationsForLead(@Param('leadId') leadId: string) {
    try {
      const applications = await this.leadApplicationsService.getApplicationsForLead(
        leadId,
      );

      return {
        success: true,
        applications,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to fetch applications',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all applications with filtering
   * GET /api/applications?propertyId=1&status=SUBMITTED
   */
  @Get()
  async getApplications(
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const filters: any = {};

      if (propertyId) filters.propertyId = parseInt(propertyId, 10);
      if (status) filters.status = status;
      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);
      if (limit) filters.limit = parseInt(limit, 10);
      if (offset) filters.offset = parseInt(offset, 10);

      const result = await this.leadApplicationsService.getApplications(
        filters,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to fetch applications',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update application status
   * PATCH /api/applications/:id/status
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body()
    body: {
      status: string;
      reviewedById?: number;
      reviewNotes?: string;
    },
  ) {
    try {
      const { status, reviewedById, reviewNotes } = body;

      if (!status) {
        throw new HttpException('Status is required', HttpStatus.BAD_REQUEST);
      }

      const application = await this.leadApplicationsService.updateApplicationStatus(
        id,
        status,
        reviewedById,
        reviewNotes,
      );

      return {
        success: true,
        application,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to update application status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update screening results
   * PATCH /api/applications/:id/screening
   */
  @Patch(':id/screening')
  async updateScreening(
    @Param('id') id: string,
    @Body()
    body: {
      creditScore?: number;
      backgroundCheckStatus?: string;
      creditCheckStatus?: string;
    },
  ) {
    try {
      const { creditScore, backgroundCheckStatus, creditCheckStatus } = body;

      const application = await this.leadApplicationsService.updateScreeningResults(
        id,
        creditScore,
        backgroundCheckStatus,
        creditCheckStatus,
      );

      return {
        success: true,
        application,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to update screening results',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Record fee payment
   * POST /api/applications/:id/payment
   */
  @Post(':id/payment')
  async recordPayment(
    @Param('id') id: string,
    @Body() body: { amount: number },
  ) {
    try {
      const { amount } = body;

      if (!amount) {
        throw new HttpException('Amount is required', HttpStatus.BAD_REQUEST);
      }

      const application = await this.leadApplicationsService.recordFeePayment(
        id,
        amount,
      );

      return {
        success: true,
        application,
        message: 'Payment recorded successfully',
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to record payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
