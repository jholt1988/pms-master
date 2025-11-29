import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, ErrorCodeMetadata } from './error-codes.enum';

/**
 * Custom API Exception with error codes
 * 
 * Extends NestJS HttpException to include standardized error codes
 * for better error handling and client-side error processing.
 */
export class ApiException extends HttpException {
  public readonly errorCode: ErrorCode;
  public readonly retryable: boolean;
  public readonly details?: Record<string, any>;

  constructor(
    errorCode: ErrorCode,
    message?: string,
    details?: Record<string, any>,
    httpStatus?: number,
  ) {
    const metadata = ErrorCodeMetadata[errorCode];
    const statusCode = httpStatus || metadata.httpStatus;
    const errorMessage = message || metadata.message;

    super(
      {
        statusCode,
        errorCode,
        message: errorMessage,
        retryable: metadata.retryable,
        timestamp: new Date().toISOString(),
        ...(details && { details }),
      },
      statusCode,
    );

    this.errorCode = errorCode;
    this.retryable = metadata.retryable;
    this.details = details;
  }

  /**
   * Create a Bad Request exception with error code
   */
  static badRequest(errorCode: ErrorCode, message?: string, details?: Record<string, any>): ApiException {
    return new ApiException(errorCode, message, details, HttpStatus.BAD_REQUEST);
  }

  /**
   * Create an Unauthorized exception with error code
   */
  static unauthorized(errorCode: ErrorCode, message?: string, details?: Record<string, any>): ApiException {
    return new ApiException(errorCode, message, details, HttpStatus.UNAUTHORIZED);
  }

  /**
   * Create a Forbidden exception with error code
   */
  static forbidden(errorCode: ErrorCode, message?: string, details?: Record<string, any>): ApiException {
    return new ApiException(errorCode, message, details, HttpStatus.FORBIDDEN);
  }

  /**
   * Create a Not Found exception with error code
   */
  static notFound(errorCode: ErrorCode, message?: string, details?: Record<string, any>): ApiException {
    return new ApiException(errorCode, message, details, HttpStatus.NOT_FOUND);
  }

  /**
   * Create a Conflict exception with error code
   */
  static conflict(errorCode: ErrorCode, message?: string, details?: Record<string, any>): ApiException {
    return new ApiException(errorCode, message, details, HttpStatus.CONFLICT);
  }

  /**
   * Create an Internal Server Error exception with error code
   */
  static internal(errorCode: ErrorCode, message?: string, details?: Record<string, any>): ApiException {
    return new ApiException(errorCode, message, details, HttpStatus.INTERNAL_SERVER_ERROR);
  }
}

