import { LogContext } from '../types';

export class Logger {
  private context: LogContext = {};

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
    if (process.env.LOG_LEVEL === 'debug') {
      this.log('debug', message, extra);
    }
  }

  private log(level: string, message: string, extra?: Record<string, any>) {
    const logEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...this.context,
      ...extra
    };

    if (level === 'error') {
      console.error(JSON.stringify(logEntry));
    } else {
      console.log(JSON.stringify(logEntry));
    }
  }
}