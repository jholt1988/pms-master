import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';
import { getRequestContext } from '../middleware/request-context';
import * as fs from 'fs';
import * as path from 'path';

const isProduction = process.env.NODE_ENV === 'production';
const LOG_DIR = process.env.LOG_DIR || 'logs';

// Attempt to create the log directory; if it fails, file transports will be skipped.
let logDirWritable = false;
try {
  fs.mkdirSync(LOG_DIR, { recursive: true });
  // Verify write access
  fs.accessSync(LOG_DIR, fs.constants.W_OK);
  logDirWritable = true;
} catch {
  // Log dir is not writable — file transports will be omitted.
  // eslint-disable-next-line no-console
  console.warn(`[Winston] Cannot write to log directory "${path.resolve(LOG_DIR)}" — file logging disabled.`);
}

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

const transports: winston.transport[] = [
  // Console transport — JSON in production for log aggregators, human-readable in dev
  new winston.transports.Console({
    format: consoleFormat,
    level: isProduction ? 'info' : 'debug',
  }),
];

if (logDirWritable) {
  // File transport for errors
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
  );

  // File transport for all logs
  transports.push(
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: logFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 10,
    }),
  );
}

export const winstonConfig: WinstonModuleOptions = {
  transports,
  
  // Exit on handled/unhandled exceptions
  exitOnError: false,
  
  // Handle uncaught exceptions — file only if writable
  exceptionHandlers: logDirWritable
    ? [
        new winston.transports.File({
          filename: path.join(LOG_DIR, 'exceptions.log'),
          format: logFormat,
        }),
      ]
    : [],
  
  // Handle unhandled promise rejections — file only if writable
  rejectionHandlers: logDirWritable
    ? [
        new winston.transports.File({
          filename: path.join(LOG_DIR, 'rejections.log'),
          format: logFormat,
        }),
      ]
    : [],
};

