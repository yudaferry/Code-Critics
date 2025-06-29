import { LogContext } from '../types';
import * as winston from 'winston';
import 'winston-daily-rotate-file';
import * as path from 'path';

export class Logger {
  private context: LogContext = {};
  private logger: winston.Logger;

  constructor() {
    // Configure the daily rotate transport
    const dailyRotateTransport = new winston.transports.DailyRotateFile({
      filename: path.join(process.cwd(), 'logs', 'app-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      zippedArchive: true,
      maxSize: '20m',
      maxFiles: '30d', // Keep logs for 30 days
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    });

    // Create the winston logger
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'code-critics' },
      transports: [
        // Console transport
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.json()
          )
        }),
        // Daily rotate file transport
        dailyRotateTransport
      ]
    });
  }

  setContext(context: Partial<LogContext>) {
    this.context = { ...this.context, ...context };
  }

  info(message: string, extra?: Record<string, any>) {
    this.log('info', message, extra);
  }

  error(message: string, error?: Error, extra?: Record<string, any>) {
    this.log('error', message, {
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined,
      ...extra
    });
  }

  warn(message: string, extra?: Record<string, any>) {
    this.log('warn', message, extra);
  }

  debug(message: string, extra?: Record<string, any>) {
    this.log('debug', message, extra);
  }

  private log(level: string, message: string, extra?: Record<string, any>) {
    this.logger.log(level, message, {
      ...this.context,
      ...extra,
      timestamp: new Date().toISOString()
    });
  }
}
