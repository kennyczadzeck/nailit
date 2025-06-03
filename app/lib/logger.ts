import winston from 'winston';
import { CloudWatchLogsClient, PutLogEventsCommand } from '@aws-sdk/client-cloudwatch-logs';

// Enhanced types for better TypeScript support
export type LogLevel = 'error' | 'warn' | 'info' | 'debug';
export type LogContext = 'auth' | 'api' | 'database' | 'email' | 'ai' | 'system' | 'user' | 'security' | 'performance';

export interface LogMetadata {
  requestId?: string;
  userId?: string;
  projectId?: string;
  sessionId?: string;
  userAgent?: string;
  ip?: string;
  endpoint?: string;
  method?: string;
  duration?: number;
  statusCode?: number;
  error?: Error | string;
  context?: LogContext;
  environment?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface StructuredLogEntry {
  level: LogLevel;
  message: string;
  metadata: LogMetadata;
  timestamp: string;
  environment: string;
  service: string;
  version: string;
}

class NailItLogger {
  private logger: winston.Logger;
  private cloudWatchClient?: CloudWatchLogsClient;
  private environment: string;
  private logGroupName: string;
  private logStreamName: string;

  constructor() {
    this.environment = process.env.NODE_ENV || 'development';
    this.logGroupName = `/nailit/${this.environment}/application`;
    this.logStreamName = `${new Date().toISOString().split('T')[0]}-${Math.random().toString(36).substr(2, 9)}`;

    // Initialize CloudWatch client if in AWS environment
    if (process.env.AWS_REGION && this.environment !== 'development') {
      this.cloudWatchClient = new CloudWatchLogsClient({
        region: process.env.AWS_REGION || 'us-east-1'
      });
    }

    this.logger = winston.createLogger({
      level: this.getLogLevel(),
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(this.formatLog.bind(this))
      ),
      defaultMeta: {
        service: 'nailit',
        environment: this.environment,
        version: process.env.npm_package_version || '1.0.0'
      },
      transports: this.getTransports()
    });

    // Handle uncaught exceptions and unhandled rejections
    this.logger.exceptions.handle(
      new winston.transports.File({ filename: 'logs/exceptions.log' })
    );

    this.logger.rejections.handle(
      new winston.transports.File({ filename: 'logs/rejections.log' })
    );
  }

  private getLogLevel(): string {
    switch (this.environment) {
      case 'production':
        return 'info';
      case 'staging':
        return 'debug';
      case 'development':
      case 'test':
        return 'debug';
      default:
        return 'info';
    }
  }

  private getTransports(): winston.transport[] {
    const transports: winston.transport[] = [];

    if (this.environment === 'development') {
      // Development: Pretty console output
      transports.push(
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf((info) => {
              const { level, message, timestamp, ...meta } = info;
              const metaStr = Object.keys(meta).length ? JSON.stringify(meta, null, 2) : '';
              return `${timestamp} [${level}]: ${message} ${metaStr}`;
            })
          )
        })
      );
    } else {
      // Production/Staging: JSON format for log aggregation
      transports.push(
        new winston.transports.Console({
          format: winston.format.json()
        })
      );

      // File transport for backup
      transports.push(
        new winston.transports.File({
          filename: 'logs/application.log',
          maxsize: 10485760, // 10MB
          maxFiles: 5,
          format: winston.format.json()
        })
      );

      transports.push(
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10485760,
          maxFiles: 5,
          format: winston.format.json()
        })
      );
    }

    return transports;
  }

  private formatLog(info: winston.Logform.TransformableInfo): string {
    const { timestamp, level, message, service, environment, version, ...meta } = info;
    
    const logEntry: StructuredLogEntry = {
      level: level as LogLevel,
      message: String(message),
      metadata: meta,
      timestamp: String(timestamp),
      environment: String(environment),
      service: String(service),
      version: String(version)
    };

    return JSON.stringify(logEntry);
  }

  // Core logging methods
  public error(message: string, metadata: LogMetadata = {}): void {
    this.log('error', message, metadata);
  }

  public warn(message: string, metadata: LogMetadata = {}): void {
    this.log('warn', message, metadata);
  }

  public info(message: string, metadata: LogMetadata = {}): void {
    this.log('info', message, metadata);
  }

  public debug(message: string, metadata: LogMetadata = {}): void {
    this.log('debug', message, metadata);
  }

  private log(level: LogLevel, message: string, metadata: LogMetadata): void {
    const enrichedMetadata = this.enrichMetadata(metadata);
    this.logger.log(level, message, enrichedMetadata);

    // Send to CloudWatch if configured
    if (this.cloudWatchClient && level === 'error') {
      this.sendToCloudWatch(level, message, enrichedMetadata).catch(err => {
        console.error('Failed to send log to CloudWatch:', err);
      });
    }
  }

  private enrichMetadata(metadata: LogMetadata): LogMetadata {
    return {
      ...metadata,
      timestamp: new Date().toISOString(),
      environment: this.environment,
      nodeVersion: process.version,
      platform: process.platform,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
  }

  // Specialized logging methods for common use cases
  public security(message: string, metadata: LogMetadata = {}): void {
    this.error(message, { ...metadata, context: 'security', security_event: true });
  }

  public performance(message: string, duration: number, metadata: LogMetadata = {}): void {
    this.info(message, { ...metadata, duration, context: 'performance' });
  }

  public audit(action: string, metadata: LogMetadata = {}): void {
    this.info(`AUDIT: ${action}`, { ...metadata, context: 'security', audit_event: true });
  }

  public apiRequest(method: string, endpoint: string, statusCode: number, duration: number, metadata: LogMetadata = {}): void {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    this.log(level, `${method} ${endpoint}`, {
      ...metadata,
      context: 'api',
      method,
      endpoint,
      statusCode,
      duration
    });
  }

  public databaseQuery(query: string, duration: number, metadata: LogMetadata = {}): void {
    this.debug('Database query executed', {
      ...metadata,
      context: 'database',
      query: query.substring(0, 200), // Truncate long queries
      duration
    });
  }

  public emailProcessing(action: string, emailId: string, metadata: LogMetadata = {}): void {
    this.info(`Email processing: ${action}`, {
      ...metadata,
      context: 'email',
      emailId,
      action
    });
  }

  public aiAnalysis(model: string, tokensUsed: number, metadata: LogMetadata = {}): void {
    this.info('AI analysis completed', {
      ...metadata,
      context: 'ai',
      model,
      tokensUsed
    });
  }

  // Request tracing utilities
  public createRequestContext(requestId: string, metadata: LogMetadata = {}): LogMetadata {
    return {
      ...metadata,
      requestId,
      startTime: Date.now()
    };
  }

  public logRequestStart(method: string, url: string, metadata: LogMetadata = {}): void {
    this.info(`Request started: ${method} ${url}`, {
      ...metadata,
      context: 'api',
      method,
      endpoint: url,
      phase: 'start'
    });
  }

  public logRequestEnd(method: string, url: string, statusCode: number, metadata: LogMetadata = {}): void {
    const duration = metadata.startTime && typeof metadata.startTime === 'number' 
      ? Date.now() - metadata.startTime 
      : undefined;
    this.apiRequest(method, url, statusCode, duration || 0, {
      ...metadata,
      phase: 'end'
    });
  }

  // CloudWatch integration
  private async sendToCloudWatch(level: LogLevel, message: string, metadata: LogMetadata): Promise<void> {
    if (!this.cloudWatchClient) return;

    try {
      const logEvent = {
        timestamp: Date.now(),
        message: JSON.stringify({
          level,
          message,
          ...metadata
        })
      };

      await this.cloudWatchClient.send(new PutLogEventsCommand({
        logGroupName: this.logGroupName,
        logStreamName: this.logStreamName,
        logEvents: [logEvent]
      }));
    } catch (error) {
      // Fallback to console if CloudWatch fails
      console.error('CloudWatch logging failed:', error);
    }
  }

  // Utility for cleaning up sensitive data from logs
  public sanitizeMetadata(metadata: LogMetadata): LogMetadata {
    const sensitive = ['password', 'token', 'secret', 'key', 'authorization'];
    const sanitized = { ...metadata };

    const sanitizeObject = (obj: Record<string, unknown>): Record<string, unknown> => {
      const result: Record<string, unknown> = {};
      
      for (const [key, value] of Object.entries(obj)) {
        if (sensitive.some(s => key.toLowerCase().includes(s))) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value as Record<string, unknown>);
        } else {
          result[key] = value;
        }
      }
      
      return result;
    };

    return sanitizeObject(sanitized);
  }
}

// Singleton instance
export const logger = new NailItLogger();

// Convenience exports
export default logger; 