import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Sentry } from './sentry.config';
import { ApiException } from './common/errors/api-exception';
import { ErrorCode } from './common/errors/error-codes.enum';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string;
    let errorCode: string | undefined;
    let retryable: boolean | undefined;
    let details: Record<string, any> | undefined;

    if (exception instanceof ApiException) {
      // Handle custom ApiException with error codes
      status = exception.getStatus();
      const responseObj = exception.getResponse() as any;
      message = responseObj.message || exception.message;
      errorCode = exception.errorCode;
      retryable = exception.retryable;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      // Handle standard NestJS HttpException
      status = exception.getStatus();
      const responseObj = exception.getResponse();
      
      if (typeof responseObj === 'object' && responseObj !== null) {
        message = (responseObj as any).message || exception.message;
        // Try to extract error code if present
        errorCode = (responseObj as any).errorCode;
      } else {
        message = exception.message;
      }
    } else {
      // Handle unexpected errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      errorCode = ErrorCode.INTERNAL_UNEXPECTED_ERROR;
      
      // Log unexpected errors to Sentry
      Sentry.captureException(exception);
    }

    // Log error details with error code
    const logMessage = errorCode 
      ? `${request.method} ${request.url} - ${status} - [${errorCode}] ${message}`
      : `${request.method} ${request.url} - ${status} - ${message}`;
    
    this.logger.error(
      logMessage,
      exception instanceof Error ? exception.stack : exception,
    );

    // Determine if we should show detailed error info
    const isDevelopment = process.env.NODE_ENV === 'development';
    const isProduction = process.env.NODE_ENV === 'production';

    const errorResponse: any = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: message,
    };

    // Add error code if available
    if (errorCode) {
      errorResponse.errorCode = errorCode;
    }

    // Add retryable flag if available
    if (retryable !== undefined) {
      errorResponse.retryable = retryable;
    }

    // Add details if available
    if (details) {
      errorResponse.details = details;
    }

    // Development-only fields
    if (isDevelopment) {
      errorResponse.stack = exception instanceof Error ? exception.stack : undefined;
      if (!(exception instanceof ApiException || exception instanceof HttpException)) {
        errorResponse.exception = exception;
      }
    }

    // Production: hide internal error details for 5xx errors
    if (isProduction && status >= 500) {
      errorResponse.message = 'Internal server error';
      delete errorResponse.details;
      delete errorResponse.stack;
    }

    response.status(status).json(errorResponse);
  }
}