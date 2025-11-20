import {
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
  Logger,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { QuickBooksMinimalService } from './quickbooks-minimal.service';

@ApiTags('QuickBooks Integration')
@ApiBearerAuth()
@Controller('quickbooks')
@UseGuards(AuthGuard('jwt'))
export class QuickBooksController {
  private readonly logger = new Logger(QuickBooksController.name);

  constructor(private readonly quickBooksService: QuickBooksMinimalService) {}

  @Get('auth-url')
  @ApiOperation({ summary: 'Get QuickBooks authorization URL' })
  @ApiResponse({ 
    status: 200, 
    description: 'Authorization URL generated successfully',
    schema: {
      properties: {
        authUrl: { type: 'string' },
        message: { type: 'string' }
      }
    }
  })
  async getAuthUrl(@Request() req: any) {
    try {
      const userId = req.user.id;
      this.logger.log(`Generating QuickBooks auth URL for user ${userId}`);
      
      const authUrl = await this.quickBooksService.getAuthorizationUrl(userId);
      
      return {
        authUrl,
        message: 'Authorization URL generated successfully'
      };
    } catch (error) {
      this.logger.error('Failed to generate auth URL', error);
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
    description: 'OAuth callback processed successfully',
    schema: {
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  async handleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('realmId') realmId: string,
  ) {
    try {
      this.logger.log('Processing QuickBooks OAuth callback');
      
      if (!code || !state || !realmId) {
        throw new HttpException(
          'Missing required callback parameters',
          HttpStatus.BAD_REQUEST,
        );
      }

      const result = await this.quickBooksService.handleOAuthCallback(
        code,
        state,
        realmId,
      );

      if (result.success) {
        this.logger.log('QuickBooks connection established successfully');
      } else {
        this.logger.error('Failed to establish QuickBooks connection');
      }

      return result;
    } catch (error) {
      this.logger.error('OAuth callback processing failed', error);
      throw new HttpException(
        'Failed to process OAuth callback',
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
      properties: {
        connected: { type: 'boolean' },
        companyName: { type: 'string' },
        lastSync: { type: 'string', format: 'date-time' },
        expiresAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  async getStatus(@Request() req: any) {
    try {
      const userId = req.user.id;
      this.logger.log(`Getting QuickBooks status for user ${userId}`);
      
      const status = await this.quickBooksService.getConnectionStatus(userId);
      return status;
    } catch (error) {
      this.logger.error('Failed to get connection status', error);
      throw new HttpException(
        'Failed to get connection status',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('sync')
  @ApiOperation({ summary: 'Sync data with QuickBooks' })
  @ApiResponse({ 
    status: 200, 
    description: 'Data sync completed successfully',
    schema: {
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        syncedItems: { type: 'number' }
      }
    }
  })
  async syncData(@Request() req: any) {
    try {
      const userId = req.user.id;
      this.logger.log(`Starting QuickBooks sync for user ${userId}`);
      
      const result = await this.quickBooksService.basicSync(userId);
      
      if (result.success) {
        this.logger.log(`QuickBooks sync completed for user ${userId}`);
      } else {
        this.logger.error(`QuickBooks sync failed for user ${userId}`);
      }

      return result;
    } catch (error) {
      this.logger.error('Data sync failed', error);
      throw new HttpException(
        'Failed to sync data with QuickBooks',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('disconnect')
  @ApiOperation({ summary: 'Disconnect from QuickBooks' })
  @ApiResponse({ 
    status: 200, 
    description: 'Disconnected from QuickBooks successfully',
    schema: {
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  async disconnect(@Request() req: any) {
    try {
      const userId = req.user.id;
      this.logger.log(`Disconnecting QuickBooks for user ${userId}`);
      
      const result = await this.quickBooksService.disconnectQuickBooks(userId);
      
      this.logger.log(`QuickBooks disconnection result for user ${userId}: ${result.success}`);
      return result;
    } catch (error) {
      this.logger.error('Failed to disconnect from QuickBooks', error);
      throw new HttpException(
        'Failed to disconnect from QuickBooks',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('test-connection')
  @ApiOperation({ summary: 'Test QuickBooks connection' })
  @ApiResponse({ 
    status: 200, 
    description: 'Connection test completed',
    schema: {
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' },
        companyInfo: { type: 'object' }
      }
    }
  })
  async testConnection(@Request() req: any) {
    try {
      const userId = req.user.id;
      this.logger.log(`Testing QuickBooks connection for user ${userId}`);
      
      const result = await this.quickBooksService.testConnection(userId);
      return result;
    } catch (error) {
      this.logger.error('Connection test failed', error);
      throw new HttpException(
        'Failed to test connection',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}