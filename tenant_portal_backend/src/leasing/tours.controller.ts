/**
 * Tours Controller
 * API endpoints for property tour management
 *
 * Security: the whole controller sits behind JWT auth (also enforced globally
 * by GlobalJwtAuthGuard) plus RolesGuard and OrgContextGuard. Management
 * endpoints are restricted to PROPERTY_MANAGER/ADMIN and org-scoped via
 * @OrgId(): a caller can only read/mutate tours whose property belongs to their
 * organization. The `schedule` intake endpoint is left open to any
 * authenticated caller (it creates a tour against a specific property on a
 * lead's behalf).
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
import { ToursService } from './tours.service';
import { isUUID } from 'class-validator';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { UpdateTourStatusDto } from './dto/update-tour-status.dto';
import { AssignTourDto } from './dto/assign-tour.dto';
import { RescheduleTourDto } from './dto/reschedule-tour.dto';

// Global prefix 'api' is applied at bootstrap; declare only the resource segment
// here. (Previously mounted 'api/tours' too, which double-prefixed to /api/api/tours.)
@Controller('tours')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class ToursController {
  constructor(private readonly toursService: ToursService) {}

  /**
   * Schedule a tour
   * POST /api/tours/schedule
   */
  @Post('schedule')
  async scheduleTour(@Body() body: any) {
    try {
      const {
        leadId,
        propertyId,
        unitId,
        preferredDate,
        preferredTime,
        notes,
      } = body;

      if (!leadId || !propertyId || !preferredDate || !preferredTime) {
        throw new HttpException(
          'Lead ID, property ID, date, and time are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (!isUUID(propertyId)) {
        throw new HttpException('Invalid propertyId', HttpStatus.BAD_REQUEST);
      }
      if (unitId && !isUUID(unitId)) {
        throw new HttpException('Invalid unitId', HttpStatus.BAD_REQUEST);
      }

      const tour = await this.toursService.scheduleTour({
        leadId,
        propertyId,
        unitId: unitId || undefined,
        scheduledDate: new Date(preferredDate),
        scheduledTime: preferredTime,
        notes,
      });

      return {
        success: true,
        tourId: tour.id,
        message: `Tour scheduled successfully for ${preferredDate} at ${preferredTime}! You'll receive a confirmation email shortly.`,
        tour,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to schedule tour',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get tour by ID (org-scoped)
   * GET /api/tours/:id
   */
  @Get(':id')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getTourById(@Param('id') id: string, @OrgId() orgId: string) {
    try {
      const tour = await this.toursService.getTourById(id, orgId);

      if (!tour) {
        throw new HttpException('Tour not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        tour,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to fetch tour',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get tours for a lead (org-scoped)
   * GET /api/tours/lead/:leadId
   */
  @Get('lead/:leadId')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getToursForLead(
    @Param('leadId') leadId: string,
    @OrgId() orgId: string,
  ) {
    try {
      const tours = await this.toursService.getToursForLead(leadId, orgId);

      return {
        success: true,
        tours,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to fetch tours',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all tours with filtering (org-scoped)
   * GET /api/tours?propertyId=1&status=SCHEDULED&dateFrom=2025-01-01
   */
  @Get()
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getTours(
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

      const result = await this.toursService.getTours(filters, orgId);

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to fetch tours',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update tour status (org-scoped)
   * PATCH /api/tours/:id/status
   */
  @Patch(':id/status')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: UpdateTourStatusDto,
    @OrgId() orgId: string,
  ) {
    try {
      const { status, feedback } = body;

      const tour = await this.toursService.updateTourStatus(
        id,
        status,
        feedback,
        orgId,
      );

      return {
        success: true,
        tour,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to update tour status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Assign tour to property manager (org-scoped)
   * PATCH /api/tours/:id/assign
   */
  @Patch(':id/assign')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async assignTour(
    @Param('id') id: string,
    @Body() body: AssignTourDto,
    @OrgId() orgId: string,
  ) {
    try {
      const { userId } = body;

      const tour = await this.toursService.assignTour(id, userId, orgId);

      return {
        success: true,
        tour,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to assign tour',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Reschedule tour (org-scoped)
   * PATCH /api/tours/:id/reschedule
   */
  @Patch(':id/reschedule')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async rescheduleTour(
    @Param('id') id: string,
    @Body() body: RescheduleTourDto,
    @OrgId() orgId: string,
  ) {
    try {
      const { scheduledDate, scheduledTime } = body;

      const tour = await this.toursService.rescheduleTour(
        id,
        new Date(scheduledDate),
        scheduledTime,
        orgId,
      );

      return {
        success: true,
        tour,
        message: 'Tour rescheduled successfully',
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        error.message || 'Failed to reschedule tour',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
