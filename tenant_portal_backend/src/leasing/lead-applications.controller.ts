/**
 * Lead Applications Controller
 * API endpoints for rental application management
 *
 * Security: JWT auth and single-org context are enforced application-wide by the
 * global auth and org-context guards; this controller adds RolesGuard. Management
 * endpoints are restricted to PROPERTY_MANAGER/ADMIN and are org-scoped via
 * @OrgId(): a caller can only read/mutate applications whose property belongs
 * to their organization. The `submit` intake endpoint is intentionally left
 * open to any authenticated caller (it creates an application against a
 * specific property on a lead's behalf).
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
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeadApplicationsService } from './lead-applications.service';
import { isUUID } from 'class-validator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { UpdateScreeningDto } from './dto/update-screening.dto';
import { RecordApplicationPaymentDto } from './dto/record-application-payment.dto';

@Controller('applications')
@UseGuards(AuthGuard('jwt'), RolesGuard)
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
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to submit application',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get application by ID (org-scoped)
   * GET /api/applications/:id
   */
  @Get(':id')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getApplicationById(@Param('id') id: string, @OrgId() orgId: string) {
    try {
      const application = await this.leadApplicationsService.getApplicationById(
        id,
        orgId,
      );

      if (!application) {
        throw new HttpException('Application not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        application,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to fetch application',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get applications for a lead (org-scoped)
   * GET /api/applications/lead/:leadId
   */
  @Get('lead/:leadId')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getApplicationsForLead(
    @Param('leadId') leadId: string,
    @OrgId() orgId: string,
  ) {
    try {
      const applications = await this.leadApplicationsService.getApplicationsForLead(
        leadId,
        orgId,
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
   * Get stale application follow-ups (org-scoped)
   * GET /api/applications/stale/follow-ups
   */
  @Get('stale/follow-ups')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getStaleFollowUps(
    @OrgId() orgId: string,
    @Query('olderThanHours') olderThanHours?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const parsedHours = olderThanHours ? parseInt(olderThanHours, 10) : undefined;
      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      const result = await this.leadApplicationsService.getStaleApplications(
        parsedHours,
        parsedLimit,
        orgId,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to fetch stale follow-ups',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all applications with filtering (org-scoped)
   * GET /api/applications?propertyId=1&status=SUBMITTED
   */
  @Get()
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getApplications(
    @OrgId() orgId: string,
    @Query('propertyId') propertyId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const filters: any = {};

      if (propertyId) {
        if (!isUUID(propertyId)) {
          throw new BadRequestException('Invalid propertyId');
        }
        filters.propertyId = propertyId;
      }
      if (status) filters.status = status;
      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);
      if (limit) filters.limit = parseInt(limit, 10);
      if (offset) filters.offset = parseInt(offset, 10);

      const result = await this.leadApplicationsService.getApplications(
        filters,
        orgId,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to fetch applications',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update application status (org-scoped)
   * PATCH /api/applications/:id/status
   */
  @Patch(':id/status')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateApplicationStatusDto,
    @OrgId() orgId: string,
  ) {
    try {
      const { status, reviewedById, reviewNotes, reasonCode } = body;

      const application = await this.leadApplicationsService.updateApplicationStatus(
        id,
        status,
        reviewedById,
        reviewNotes,
        reasonCode,
        orgId,
      );

      return {
        success: true,
        application,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to update application status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update screening results (org-scoped)
   * PATCH /api/applications/:id/screening
   */
  @Patch(':id/screening')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async updateScreening(
    @Param('id') id: string,
    @Body() body: UpdateScreeningDto,
    @OrgId() orgId: string,
  ) {
    try {
      const { creditScore, backgroundCheckStatus, creditCheckStatus } = body;

      const application = await this.leadApplicationsService.updateScreeningResults(
        id,
        creditScore,
        backgroundCheckStatus,
        creditCheckStatus,
        orgId,
      );

      return {
        success: true,
        application,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to update screening results',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Record fee payment (org-scoped)
   * POST /api/applications/:id/payment
   */
  @Post(':id/payment')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async recordPayment(
    @Param('id') id: string,
    @Body() body: RecordApplicationPaymentDto,
    @OrgId() orgId: string,
  ) {
    try {
      const { amount } = body;

      const application = await this.leadApplicationsService.recordFeePayment(
        id,
        amount,
        orgId,
      );

      return {
        success: true,
        application,
        message: 'Payment recorded successfully',
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to record payment',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
