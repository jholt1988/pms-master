/**
 * Leasing Controller
 * API endpoints for lead management and property search
 */

import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { LeasingService } from './leasing.service';

@Controller(['api/leasing', 'leasing'])
export class LeasingController {
  constructor(private readonly leasingService: LeasingService) {}

  /**
   * Create or update a lead
   * POST /leasing/leads
   */
  @Post('leads')
  async createLead(@Body() body: any) {
    try {
      const { sessionId, ...leadData } = body;

      if (!sessionId) {
        throw new HttpException('Session ID is required', HttpStatus.BAD_REQUEST);
      }

      const lead = await this.leasingService.upsertLead(sessionId, leadData);

      return {
        success: true,
        leadId: lead.id,
        message: 'Lead saved successfully',
      };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to create lead',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get lead by session ID
   * GET /leasing/leads/session/:sessionId
   */
  @Get('leads/session/:sessionId')
  async getLeadBySession(@Param('sessionId') sessionId: string) {
    try {
      const lead = await this.leasingService.getLeadBySessionId(sessionId);

      if (!lead) {
        throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        lead,
      };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to fetch lead',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get lead by ID
   * GET /leasing/leads/:id
   */
  @Get('leads/:id')
  async getLeadById(@Param('id') id: string) {
    try {
      const lead = await this.leasingService.getLeadById(id);

      if (!lead) {
        throw new HttpException('Lead not found', HttpStatus.NOT_FOUND);
      }

      return {
        success: true,
        lead,
      };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to fetch lead',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get all leads with filtering
   * GET /leasing/leads?status=NEW&search=john&limit=20&offset=0
   */
  @Get('leads')
  async getLeads(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    try {
      const filters: any = {};

      if (status) filters.status = status;
      if (search) filters.search = search;
      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);
      if (limit) filters.limit = parseInt(limit, 10);
      if (offset) filters.offset = parseInt(offset, 10);

      const result = await this.leasingService.getLeads(filters);

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to fetch leads',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Add a message to conversation
   * POST /leasing/leads/:id/messages
   */
  @Post('leads/:id/messages')
  async addMessage(
    @Param('id') leadId: string,
    @Body() body: { role: string; content: string; metadata?: any },
  ) {
    try {
      const { role, content, metadata } = body;

      if (!role || !content) {
        throw new HttpException(
          'Role and content are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const message = await this.leasingService.addMessage(
        leadId,
        role as any,
        content,
        metadata,
      );

      return {
        success: true,
        message,
      };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to add message',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get conversation history
   * GET /leasing/leads/:id/messages
   */
  @Get('leads/:id/messages')
  async getMessages(@Param('id') leadId: string) {
    try {
      const messages = await this.leasingService.getConversationHistory(leadId);

      return {
        success: true,
        messages,
      };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to fetch messages',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Search properties
   * POST /leasing/leads/:id/properties/search
   */
  @Post('leads/:id/properties/search')
  @HttpCode(200)
  async searchProperties(
    @Param('id') leadId: string,
    @Body() criteria: {
      bedrooms?: number;
      bathrooms?: number;
      maxRent?: number;
      petFriendly?: boolean;
      limit?: number;
    },
  ) {
    try {
      const properties = await this.leasingService.searchProperties(criteria);

      return {
        success: true,
        properties,
      };
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to search properties',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Record property inquiry
   * POST /leasing/leads/:id/inquiries
   */
  @Post('leads/:id/inquiries')
  async recordInquiry(
    @Param('id') leadId: string,
    @Body() body: { propertyId: number; unitId?: number; interestLevel?: string },
  ) {
    try {
      const { propertyId, unitId, interestLevel } = body;

      if (!propertyId) {
        throw new HttpException('Property ID is required', HttpStatus.BAD_REQUEST);
      }

      const inquiry = await this.leasingService.recordPropertyInquiry(
        leadId,
        propertyId,
        unitId,
        interestLevel as any,
      );

      return inquiry;
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to record inquiry',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Update lead status
   * PATCH /leasing/leads/:id/status
   */
  @Patch('leads/:id/status')
  async updateStatus(
    @Param('id') leadId: string,
    @Body() body: { status: string },
  ) {
    try {
      const { status } = body;

      if (!status) {
        throw new HttpException('Status is required', HttpStatus.BAD_REQUEST);
      }

      const lead = await this.leasingService.updateLeadStatus(leadId, status as any);

      return lead;
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to update status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get leasing statistics
   * GET /leasing/statistics
   */
  @Get('statistics')
  async getStatistics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    try {
      const stats = await this.leasingService.getLeadStatistics(
        dateFrom ? new Date(dateFrom) : undefined,
        dateTo ? new Date(dateTo) : undefined,
      );

      return stats;
    } catch (error) {
      throw new HttpException(
        error instanceof Error ? error.message : 'Failed to fetch statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
