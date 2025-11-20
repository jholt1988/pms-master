import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { QuickBooksMinimalService } from './quickbooks-minimal.service';

@ApiTags('quickbooks')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('quickbooks')
export class QuickBooksController {
  private readonly logger = new Logger(QuickBooksController.name);

  constructor(private readonly quickBooksService: QuickBooksMinimalService) {}

  @Get('auth-url')
  @ApiOperation({ summary: 'Get QuickBooks OAuth authorization URL' })
  @ApiResponse({
    status: 200,
    description: 'Authorization URL generated successfully',
    schema: {
      type: 'object',
      properties: {
        authUrl: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getAuthUrl(@Request() req: any) {
    try {
      const userId = req.user.id;
      const authUrl = this.quickBooksService.getAuthorizationUrl(userId);
      return { authUrl };
    } catch (error: any) {
      this.logger.error('Failed to generate QuickBooks auth URL:', error);
      throw new HttpException(
        'Failed to generate authorization URL',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('callback')
  @ApiOperation({ summary: 'Handle QuickBooks OAuth callback' })
  @ApiResponse({
    status: 200,
    description: 'QuickBooks connection established successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        companyId: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'Invalid callback parameters' })
  @ApiResponse({ status: 500, description: 'Connection failed' })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('realmId') realmId: string,
  ) {
    try {
      if (!code || !state || !realmId) {
        throw new HttpException(
          'Missing required callback parameters',
          HttpStatus.BAD_REQUEST,
        );
      }

      const connection = await this.quickBooksService.handleOAuthCallback(
        code,
        state,
        realmId,
      );

      this.logger.log(`QuickBooks connection established: ${connection.companyId}`);
      
      return {
        success: true,
        message: 'QuickBooks connection established successfully',
        companyId: connection.companyId,
      };
    } catch (error: any) {
      this.logger.error('QuickBooks callback failed:', error);
      throw new HttpException(
        error.message || 'Failed to establish QuickBooks connection',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('status')
  @ApiOperation({ summary: 'Get QuickBooks connection status' })
  @ApiResponse({
    status: 200,
    description: 'Connection status retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        isConnected: { type: 'boolean' },
        lastSyncAt: { type: 'string', format: 'date-time', nullable: true },
        companyName: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatus(@Request() req: any) {
    try {
      const userId = req.user.id;
      const status = await this.quickBooksService.getSyncStatus(userId);
      return status;
    } catch (error: any) {
      this.logger.error('Failed to get QuickBooks status:', error);
      throw new HttpException(
        'Failed to retrieve connection status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync property management data to QuickBooks' })
  @ApiResponse({
    status: 200,
    description: 'Sync completed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        syncedItems: { type: 'number' },
        errors: { type: 'array', items: { type: 'string' } },
        lastSyncAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 400, description: 'No QuickBooks connection found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 500, description: 'Sync failed' })
  async syncData(@Request() req: any): Promise<SyncResult> {
    try {
      const userId = req.user.id;
      this.logger.log(`Starting QuickBooks sync for user ${userId}`);
      const result = await this.quickBooksService.syncToQuickBooks(userId);
      
      if (result.success) {
        this.logger.log(`QuickBooks sync completed successfully: ${result.syncedItems} items synced`);
      } else {
        this.logger.warn(`QuickBooks sync completed with errors: ${result.errors.length} errors`);
      }
      
      return result;
    } catch (error: any) {
      this.logger.error('QuickBooks sync failed:', error);
      
      if (error.message.includes('No active QuickBooks connection')) {
        throw new HttpException(
          'No active QuickBooks connection found. Please connect first.',
          HttpStatus.BAD_REQUEST,
        );
      }
      
      throw new HttpException(
        error.message || 'Failed to sync data to QuickBooks',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('disconnect')
  @ApiOperation({ summary: 'Disconnect QuickBooks integration' })
  @ApiResponse({
    status: 200,
    description: 'QuickBooks disconnected successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async disconnect(@Request() req: any) {
    try {
      const userId = req.user.id;
      await this.quickBooksService.disconnect(userId);
      
      this.logger.log(`QuickBooks disconnected for user ${userId}`);
      
      return {
        success: true,
        message: 'QuickBooks integration disconnected successfully',
      };
    } catch (error: any) {
      this.logger.error('Failed to disconnect QuickBooks:', error);
      throw new HttpException(
        'Failed to disconnect QuickBooks integration',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('test-connection')
  @ApiOperation({ summary: 'Test QuickBooks connection' })
  @ApiResponse({
    status: 200,
    description: 'Connection test result',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async testConnection(@Request() req: any) {
    try {
      const userId = req.user.id;
      const result = await this.quickBooksService.testConnection(userId);
      
      this.logger.log(`QuickBooks connection test for user ${userId}: ${result.success ? 'SUCCESS' : 'FAILED'}`);
      
      return result;
    } catch (error: any) {
      this.logger.error('Failed to test QuickBooks connection:', error);
      throw new HttpException(
        'Failed to test QuickBooks connection',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}