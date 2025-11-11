import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import config from './index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Custom format for console output
const consoleFormat = printf(({ level, message, timestamp, correlationId, ...meta }) => {
  let log = `${timestamp} [${level}]`;
  if (correlationId) {
    log += ` [${correlationId}]`;
  }
  log += `: ${message}`;
  
  if (Object.keys(meta).length > 0) {
    log += ` ${JSON.stringify(meta)}`;
  }
  
  return log;
});

// Create logger instance
const logger = winston.createLogger({
  level: config.logging.level,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' })
  ),
  defaultMeta: { service: 'collab-editor' },
  transports: [
    // Console transport
    new winston.transports.Console({
      format: combine(
        colorize(),
        consoleFormat
      )
    }),
    // File transport for all logs
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'combined.log'),
      format: json(),
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    // File transport for errors only
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'error.log'),
      level: 'error',
      format: json(),
      maxsize: 10485760,
      maxFiles: 5
    })
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'exceptions.log'),
      format: json()
    })
  ],
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(config.logging.dir, 'rejections.log'),
      format: json()
    })
  ]
});

// Create child logger with correlation ID
export const createLogger = (correlationId) => {
  return logger.child({ correlationId });
};

export default logger;
