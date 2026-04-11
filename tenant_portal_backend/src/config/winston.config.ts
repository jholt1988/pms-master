import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import { getRequestContext } from '../middleware/request-context';

const isProduction = process.env.NODE_ENV === 'production';

const injectRequestContext = winston.format((info) => {
  const ctx = getRequestContext();
  if (ctx) {
    info.requestId = ctx.requestId;
    if (ctx.userId) info.userId = ctx.userId;
    if (ctx.orgId) info.orgId = ctx.orgId;
  }
  return info;
});

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  injectRequestContext(),
  winston.format.json(),
);

const consoleFormat = isProduction
  ? logFormat
  : winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      injectRequestContext(),
      winston.format.printf((info) => {
        const timestamp = String(info.timestamp ?? '');
        const level = String(info.level ?? 'info');
        const message = String(info.message ?? '');
        const context = typeof info.context === 'string' ? info.context : 'Application';
        const stack = typeof info.stack === 'string' ? info.stack : '';
        const requestId = typeof info.requestId === 'string' ? info.requestId : undefined;
        const rid = requestId ? ` [${requestId.slice(0, 8)}]` : '';
        return `${timestamp} [${context}]${rid} ${level}: ${message}${stack ? '\n' + stack : ''}`;
      }),
    );

export const winstonConfig: WinstonModuleOptions = {
  transports: [
    // Console transport — JSON in production for log aggregators, human-readable in dev
    new winston.transports.Console({
      format: consoleFormat,
      level: isProduction ? 'info' : 'debug',
    }),
    
    // File transport for errors
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  ],
  
  // Exit on handled/unhandled exceptions
  exitOnError: false,
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: 'logs/exceptions.log',
      format: logFormat,
    }),
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: 'logs/rejections.log',
      format: logFormat,
    }),
  ],
};
