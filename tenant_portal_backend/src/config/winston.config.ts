import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const winstonConfig: WinstonModuleOptions = {
  transports: [
    // Console transport
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
        winston.format.printf(({ timestamp, level, message, context, stack }) => {
          return `${timestamp} [${context || 'Application'}] ${level}: ${message}${stack ? '\n' + stack : ''}`;
        }),
      ),
      level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
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