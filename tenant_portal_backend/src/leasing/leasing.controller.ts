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
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LeasingService } from './leasing.service';
import { LeadStatus } from '@prisma/client';

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
        throw new HttpException('sessionId is required', HttpStatus.BAD_REQUEST);
      }

      const lead = await this.leasingService.upsertLead(sessionId, leadData);

      return lead;
    } catch (error) {
      this.handleError(error, 'Failed to create lead');
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

      return lead;
    } catch (error) {
      this.handleError(error, 'Failed to fetch lead');
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

      return lead;
    } catch (error) {
      this.handleError(error, 'Failed to fetch lead');
    }
  }

  /**
   * Get all leads with filtering
   * GET /leasing/leads?status=NEW&search=john&limit=20&offset=0
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('leads')
  async getLeads(
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('page') page?: string,
  ) {
    try {
      const filters: any = {};

      if (status) filters.status = status;
      if (search) filters.search = search;
      if (dateFrom) filters.dateFrom = new Date(dateFrom);
      if (dateTo) filters.dateTo = new Date(dateTo);
      const parsedLimit = limit ? parseInt(limit, 10) : undefined;
      const parsedOffset = offset ? parseInt(offset, 10) : undefined;
      const parsedPage = page ? parseInt(page, 10) : undefined;

      if (parsedLimit && parsedLimit > 0) {
        filters.limit = parsedLimit;
      }

      if (parsedOffset && parsedOffset >= 0) {
        filters.offset = parsedOffset;
      } else if (parsedPage && parsedPage > 0) {
        const effectiveLimit = filters.limit ?? 50;
        filters.offset = (parsedPage - 1) * effectiveLimit;
      }

      if (parsedPage && parsedPage > 0) {
        filters.page = parsedPage;
      }

      return this.leasingService.getLeads(filters);
    } catch (error) {
      this.handleError(error, 'Failed to fetch leads');
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
          'role and content are required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const message = await this.leasingService.addMessage(
        leadId,
        role as any,
        content,
        metadata,
      );

      return message;
    } catch (error) {
      this.handleError(error, 'Failed to add message');
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

      return messages;
    } catch (error) {
      this.handleError(error, 'Failed to fetch messages');
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
      return this.leasingService.searchProperties(criteria);
    } catch (error) {
      this.handleError(error, 'Failed to search properties');
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
        throw new HttpException('propertyId is required', HttpStatus.BAD_REQUEST);
      }

      const inquiry = await this.leasingService.recordPropertyInquiry(
        leadId,
        propertyId,
        unitId,
        interestLevel as any,
      );

      return {
        ...inquiry,
        interestLevel: inquiry.interest,
      };
    } catch (error) {
      this.handleError(error, 'Failed to record inquiry');
    }
  }

  /**
   * Update lead status
   * PATCH /leasing/leads/:id/status
   */
  @UseGuards(AuthGuard('jwt'))
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

      if (!(Object.values(LeadStatus) as string[]).includes(status)) {
        throw new HttpException('Invalid status value', HttpStatus.BAD_REQUEST);
      }

      const lead = await this.leasingService.updateLeadStatus(leadId, status as any);

      return lead;
    } catch (error) {
      this.handleError(error, 'Failed to update status');
    }
  }

  /**
   * Get leasing statistics
   * GET /leasing/statistics
   */
  @UseGuards(AuthGuard('jwt'))
  @Get('statistics')
  async getStatistics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const from = dateFrom || startDate;
      const to = dateTo || endDate;

      return this.leasingService.getLeadStatistics(
        from ? new Date(from) : undefined,
        to ? new Date(to) : undefined,
      );
    } catch (error) {
      this.handleError(error, 'Failed to fetch statistics');
    }
  }

  private handleError(error: unknown, fallbackMessage: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new HttpException(
      error instanceof Error ? error.message : fallbackMessage,
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
