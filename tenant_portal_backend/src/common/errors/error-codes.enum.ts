/**
 * API Error Codes
 * 
 * Standardized error codes for consistent error handling across the application.
 * Error codes follow the pattern: MODULE_ACTION_ERROR_TYPE
 * 
 * Format: [MODULE]_[ACTION]_[ERROR_TYPE]
 * - MODULE: The module/domain (e.g., AUTH, PAYMENT, LEASE, MAINTENANCE)
 * - ACTION: The action that failed (e.g., LOGIN, CREATE, UPDATE, DELETE)
 * - ERROR_TYPE: The type of error (e.g., NOT_FOUND, INVALID, UNAUTHORIZED, CONFLICT)
 */

export enum ErrorCode {
  // ============================================================================
  // AUTHENTICATION & AUTHORIZATION ERRORS (1xxx)
  // ============================================================================
  AUTH_LOGIN_INVALID_CREDENTIALS = 'AUTH_001',
  AUTH_LOGIN_USER_NOT_FOUND = 'AUTH_002',
  AUTH_LOGIN_ACCOUNT_LOCKED = 'AUTH_003',
  AUTH_TOKEN_INVALID = 'AUTH_004',
  AUTH_TOKEN_EXPIRED = 'AUTH_005',
  AUTH_TOKEN_MISSING = 'AUTH_006',
  AUTH_REFRESH_TOKEN_INVALID = 'AUTH_007',
  AUTH_MFA_REQUIRED = 'AUTH_008',
  AUTH_MFA_INVALID = 'AUTH_009',
  AUTH_PASSWORD_RESET_TOKEN_INVALID = 'AUTH_010',
  AUTH_PASSWORD_RESET_TOKEN_EXPIRED = 'AUTH_011',
  AUTH_ROLE_INSUFFICIENT = 'AUTH_012',
  AUTH_UNAUTHORIZED = 'AUTH_013',
  AUTH_FORBIDDEN = 'AUTH_014',

  // ============================================================================
  // VALIDATION ERRORS (2xxx)
  // ============================================================================
  VALIDATION_INVALID_INPUT = 'VALID_001',
  VALIDATION_MISSING_REQUIRED_FIELD = 'VALID_002',
  VALIDATION_INVALID_FORMAT = 'VALID_003',
  VALIDATION_OUT_OF_RANGE = 'VALID_004',
  VALIDATION_INVALID_TYPE = 'VALID_005',
  VALIDATION_DUPLICATE_VALUE = 'VALID_006',

  // ============================================================================
  // RESOURCE NOT FOUND ERRORS (3xxx)
  // ============================================================================
  RESOURCE_NOT_FOUND = 'RES_001',
  USER_NOT_FOUND = 'RES_002',
  PROPERTY_NOT_FOUND = 'RES_003',
  UNIT_NOT_FOUND = 'RES_004',
  LEASE_NOT_FOUND = 'RES_005',
  INVOICE_NOT_FOUND = 'RES_006',
  PAYMENT_NOT_FOUND = 'RES_007',
  MAINTENANCE_REQUEST_NOT_FOUND = 'RES_008',
  DOCUMENT_NOT_FOUND = 'RES_009',
  RENT_RECOMMENDATION_NOT_FOUND = 'RES_010',
  PAYMENT_PLAN_NOT_FOUND = 'RES_011',

  // ============================================================================
  // BUSINESS LOGIC ERRORS (4xxx)
  // ============================================================================
  BUSINESS_INVALID_STATE = 'BIZ_001',
  BUSINESS_OPERATION_NOT_ALLOWED = 'BIZ_002',
  BUSINESS_CONFLICT = 'BIZ_003',
  BUSINESS_PRECONDITION_FAILED = 'BIZ_004',
  LEASE_ALREADY_EXISTS = 'BIZ_005',
  LEASE_INVALID_STATUS_TRANSITION = 'BIZ_006',
  PAYMENT_PLAN_ALREADY_EXISTS = 'BIZ_007',
  RENT_RECOMMENDATION_INVALID_STATUS = 'BIZ_008',
  RENT_RECOMMENDATION_ALREADY_ACCEPTED = 'BIZ_009',
  RENT_RECOMMENDATION_CANNOT_DELETE_ACCEPTED = 'BIZ_010',
  MAINTENANCE_REQUEST_INVALID_STATUS = 'BIZ_011',

  // ============================================================================
  // EXTERNAL SERVICE ERRORS (5xxx)
  // ============================================================================
  EXTERNAL_SERVICE_UNAVAILABLE = 'EXT_001',
  EXTERNAL_SERVICE_TIMEOUT = 'EXT_002',
  EXTERNAL_SERVICE_ERROR = 'EXT_003',
  ML_SERVICE_UNAVAILABLE = 'EXT_004',
  ML_SERVICE_ERROR = 'EXT_005',
  PAYMENT_GATEWAY_ERROR = 'EXT_006',
  EMAIL_SERVICE_ERROR = 'EXT_007',
  QUICKBOOKS_ERROR = 'EXT_008',

  // ============================================================================
  // DATABASE ERRORS (6xxx)
  // ============================================================================
  DATABASE_ERROR = 'DB_001',
  DATABASE_CONSTRAINT_VIOLATION = 'DB_002',
  DATABASE_CONNECTION_ERROR = 'DB_003',
  DATABASE_TRANSACTION_FAILED = 'DB_004',

  // ============================================================================
  // INTERNAL SERVER ERRORS (9xxx)
  // ============================================================================
  INTERNAL_SERVER_ERROR = 'INT_001',
  INTERNAL_UNEXPECTED_ERROR = 'INT_002',
  INTERNAL_CONFIGURATION_ERROR = 'INT_003',
}

/**
 * Error code metadata for documentation and client handling
 */
export const ErrorCodeMetadata: Record<ErrorCode, { message: string; httpStatus: number; retryable: boolean }> = {
  // Authentication
  [ErrorCode.AUTH_LOGIN_INVALID_CREDENTIALS]: { message: 'Invalid credentials', httpStatus: 401, retryable: false },
  [ErrorCode.AUTH_LOGIN_USER_NOT_FOUND]: { message: 'User not found', httpStatus: 404, retryable: false },
  [ErrorCode.AUTH_LOGIN_ACCOUNT_LOCKED]: { message: 'Account is locked', httpStatus: 403, retryable: false },
  [ErrorCode.AUTH_TOKEN_INVALID]: { message: 'Invalid authentication token', httpStatus: 401, retryable: false },
  [ErrorCode.AUTH_TOKEN_EXPIRED]: { message: 'Authentication token expired', httpStatus: 401, retryable: false },
  [ErrorCode.AUTH_TOKEN_MISSING]: { message: 'Authentication token missing', httpStatus: 401, retryable: false },
  [ErrorCode.AUTH_REFRESH_TOKEN_INVALID]: { message: 'Invalid refresh token', httpStatus: 401, retryable: false },
  [ErrorCode.AUTH_MFA_REQUIRED]: { message: 'Multi-factor authentication required', httpStatus: 401, retryable: false },
  [ErrorCode.AUTH_MFA_INVALID]: { message: 'Invalid MFA code', httpStatus: 401, retryable: false },
  [ErrorCode.AUTH_PASSWORD_RESET_TOKEN_INVALID]: { message: 'Invalid password reset token', httpStatus: 400, retryable: false },
  [ErrorCode.AUTH_PASSWORD_RESET_TOKEN_EXPIRED]: { message: 'Password reset token expired', httpStatus: 400, retryable: false },
  [ErrorCode.AUTH_ROLE_INSUFFICIENT]: { message: 'Insufficient permissions', httpStatus: 403, retryable: false },
  [ErrorCode.AUTH_UNAUTHORIZED]: { message: 'Unauthorized', httpStatus: 401, retryable: false },
  [ErrorCode.AUTH_FORBIDDEN]: { message: 'Forbidden', httpStatus: 403, retryable: false },

  // Validation
  [ErrorCode.VALIDATION_INVALID_INPUT]: { message: 'Invalid input', httpStatus: 400, retryable: false },
  [ErrorCode.VALIDATION_MISSING_REQUIRED_FIELD]: { message: 'Missing required field', httpStatus: 400, retryable: false },
  [ErrorCode.VALIDATION_INVALID_FORMAT]: { message: 'Invalid format', httpStatus: 400, retryable: false },
  [ErrorCode.VALIDATION_OUT_OF_RANGE]: { message: 'Value out of range', httpStatus: 400, retryable: false },
  [ErrorCode.VALIDATION_INVALID_TYPE]: { message: 'Invalid type', httpStatus: 400, retryable: false },
  [ErrorCode.VALIDATION_DUPLICATE_VALUE]: { message: 'Duplicate value', httpStatus: 400, retryable: false },

  // Resource Not Found
  [ErrorCode.RESOURCE_NOT_FOUND]: { message: 'Resource not found', httpStatus: 404, retryable: false },
  [ErrorCode.USER_NOT_FOUND]: { message: 'User not found', httpStatus: 404, retryable: false },
  [ErrorCode.PROPERTY_NOT_FOUND]: { message: 'Property not found', httpStatus: 404, retryable: false },
  [ErrorCode.UNIT_NOT_FOUND]: { message: 'Unit not found', httpStatus: 404, retryable: false },
  [ErrorCode.LEASE_NOT_FOUND]: { message: 'Lease not found', httpStatus: 404, retryable: false },
  [ErrorCode.INVOICE_NOT_FOUND]: { message: 'Invoice not found', httpStatus: 404, retryable: false },
  [ErrorCode.PAYMENT_NOT_FOUND]: { message: 'Payment not found', httpStatus: 404, retryable: false },
  [ErrorCode.MAINTENANCE_REQUEST_NOT_FOUND]: { message: 'Maintenance request not found', httpStatus: 404, retryable: false },
  [ErrorCode.DOCUMENT_NOT_FOUND]: { message: 'Document not found', httpStatus: 404, retryable: false },
  [ErrorCode.RENT_RECOMMENDATION_NOT_FOUND]: { message: 'Rent recommendation not found', httpStatus: 404, retryable: false },
  [ErrorCode.PAYMENT_PLAN_NOT_FOUND]: { message: 'Payment plan not found', httpStatus: 404, retryable: false },

  // Business Logic
  [ErrorCode.BUSINESS_INVALID_STATE]: { message: 'Invalid state', httpStatus: 400, retryable: false },
  [ErrorCode.BUSINESS_OPERATION_NOT_ALLOWED]: { message: 'Operation not allowed', httpStatus: 403, retryable: false },
  [ErrorCode.BUSINESS_CONFLICT]: { message: 'Conflict', httpStatus: 409, retryable: false },
  [ErrorCode.BUSINESS_PRECONDITION_FAILED]: { message: 'Precondition failed', httpStatus: 412, retryable: false },
  [ErrorCode.LEASE_ALREADY_EXISTS]: { message: 'Lease already exists', httpStatus: 409, retryable: false },
  [ErrorCode.LEASE_INVALID_STATUS_TRANSITION]: { message: 'Invalid lease status transition', httpStatus: 400, retryable: false },
  [ErrorCode.PAYMENT_PLAN_ALREADY_EXISTS]: { message: 'Payment plan already exists', httpStatus: 409, retryable: false },
  [ErrorCode.RENT_RECOMMENDATION_INVALID_STATUS]: { message: 'Invalid rent recommendation status', httpStatus: 400, retryable: false },
  [ErrorCode.RENT_RECOMMENDATION_ALREADY_ACCEPTED]: { message: 'Rent recommendation already accepted', httpStatus: 409, retryable: false },
  [ErrorCode.RENT_RECOMMENDATION_CANNOT_DELETE_ACCEPTED]: { message: 'Cannot delete accepted recommendation', httpStatus: 400, retryable: false },
  [ErrorCode.MAINTENANCE_REQUEST_INVALID_STATUS]: { message: 'Invalid maintenance request status', httpStatus: 400, retryable: false },

  // External Service
  [ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: { message: 'External service unavailable', httpStatus: 503, retryable: true },
  [ErrorCode.EXTERNAL_SERVICE_TIMEOUT]: { message: 'External service timeout', httpStatus: 504, retryable: true },
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: { message: 'External service error', httpStatus: 502, retryable: true },
  [ErrorCode.ML_SERVICE_UNAVAILABLE]: { message: 'ML service unavailable', httpStatus: 503, retryable: true },
  [ErrorCode.ML_SERVICE_ERROR]: { message: 'ML service error', httpStatus: 502, retryable: true },
  [ErrorCode.PAYMENT_GATEWAY_ERROR]: { message: 'Payment gateway error', httpStatus: 502, retryable: true },
  [ErrorCode.EMAIL_SERVICE_ERROR]: { message: 'Email service error', httpStatus: 502, retryable: true },
  [ErrorCode.QUICKBOOKS_ERROR]: { message: 'QuickBooks integration error', httpStatus: 502, retryable: true },

  // Database
  [ErrorCode.DATABASE_ERROR]: { message: 'Database error', httpStatus: 500, retryable: true },
  [ErrorCode.DATABASE_CONSTRAINT_VIOLATION]: { message: 'Database constraint violation', httpStatus: 400, retryable: false },
  [ErrorCode.DATABASE_CONNECTION_ERROR]: { message: 'Database connection error', httpStatus: 503, retryable: true },
  [ErrorCode.DATABASE_TRANSACTION_FAILED]: { message: 'Database transaction failed', httpStatus: 500, retryable: true },

  // Internal
  [ErrorCode.INTERNAL_SERVER_ERROR]: { message: 'Internal server error', httpStatus: 500, retryable: false },
  [ErrorCode.INTERNAL_UNEXPECTED_ERROR]: { message: 'Unexpected error', httpStatus: 500, retryable: false },
  [ErrorCode.INTERNAL_CONFIGURATION_ERROR]: { message: 'Configuration error', httpStatus: 500, retryable: false },
};

