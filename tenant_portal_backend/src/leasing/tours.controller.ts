/**
 * Tours Controller
 * API endpoints for property tour management
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
import { ToursService } from './tours.service';

@Controller('api/tours')
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

      const tour = await this.toursService.scheduleTour({
        leadId,
        propertyId: parseInt(propertyId, 10),
        unitId: unitId ? parseInt(unitId, 10) : undefined,
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
      throw new HttpException(
        error.message || 'Failed to schedule tour',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get tour by ID
   * GET /api/tours/:id
   */
  @Get(':id')
  async getTourById(@Param('id') id: string) {
    try {
      const tour = await this.toursService.getTourById(id);

      if (!tour) {
        throw new HttpException('Tour not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        tour,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to fetch tour',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get tours for a lead
   * GET /api/tours/lead/:leadId
   */
  @Get('lead/:leadId')
  async getToursForLead(@Param('leadId') leadId: string) {
    try {
      const tours = await this.toursService.getToursForLead(leadId);

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
   * Get all tours with filtering
   * GET /api/tours?propertyId=1&status=SCHEDULED&dateFrom=2025-01-01
   */
  @Get()
  async getTours(
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

      const result = await this.toursService.getTours(filters);

      return {
        success: true,
        ...result,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to fetch tours',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update tour status
   * PATCH /api/tours/:id/status
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; feedback?: string },
  ) {
    try {
      const { status, feedback } = body;

      if (!status) {
        throw new HttpException('Status is required', HttpStatus.BAD_REQUEST);
      }

      const tour = await this.toursService.updateTourStatus(id, status, feedback);

      return {
        success: true,
        tour,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to update tour status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Assign tour to property manager
   * PATCH /api/tours/:id/assign
   */
  @Patch(':id/assign')
  async assignTour(
    @Param('id') id: string,
    @Body() body: { userId: number },
  ) {
    try {
      const { userId } = body;

      if (!userId) {
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }

      const tour = await this.toursService.assignTour(id, userId);

      return {
        success: true,
        tour,
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to assign tour',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Reschedule tour
   * PATCH /api/tours/:id/reschedule
   */
  @Patch(':id/reschedule')
  async rescheduleTour(
    @Param('id') id: string,
    @Body() body: { scheduledDate: string; scheduledTime: string },
  ) {
    try {
      const { scheduledDate, scheduledTime } = body;

      if (!scheduledDate || !scheduledTime) {
        throw new HttpException(
          'Date and time are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const tour = await this.toursService.rescheduleTour(
        id,
        new Date(scheduledDate),
        scheduledTime,
      );

      return {
        success: true,
        tour,
        message: 'Tour rescheduled successfully',
      };
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to reschedule tour',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
