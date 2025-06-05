import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

export interface RequestLogContext {
  requestId: string;
  method: string;
  url: string;
  userAgent?: string;
  ip?: string;
  startTime: number;
  userId?: string;
  sessionId?: string;
}

/**
 * Enhanced request logging middleware for Next.js API routes
 * Provides automatic request tracing, performance monitoring, and structured logging
 */
export class RequestLogger {
  /**
   * Creates a request context with unique ID for tracing
   */
  static createContext(request: NextRequest): RequestLogContext {
    const requestId = uuidv4();
    const url = request.url;
    const method = request.method;
    const userAgent = request.headers.get('user-agent') || undefined;
    const forwarded = request.headers.get('x-forwarded-for');
    const ip = forwarded ? forwarded.split(',')[0].trim() : 
               request.headers.get('x-real-ip') || 
               'unknown';

    const context: RequestLogContext = {
      requestId,
      method,
      url,
      userAgent,
      ip,
      startTime: Date.now()
    };

    // Add authentication context if available
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      context.sessionId = 'session-placeholder';
    }

    return context;
  }

  /**
   * Logs the start of a request
   */
  static logStart(context: RequestLogContext): void {
    logger.logRequestStart(context.method, context.url, {
      requestId: context.requestId,
      userAgent: context.userAgent,
      ip: context.ip,
      userId: context.userId,
      sessionId: context.sessionId,
      startTime: context.startTime
    });
  }

  /**
   * Logs the completion of a request with performance metrics
   */
  static logEnd(context: RequestLogContext, response: NextResponse | Response, error?: Error): void {
    const startTime = context.startTime;
    const duration = Date.now() - startTime;
    const statusCode = response.status;

    if (error) {
      logger.error(`Request failed: ${context.method} ${context.url}`, {
        requestId: context.requestId,
        method: context.method,
        endpoint: context.url,
        statusCode,
        duration,
        error: error.message,
        stack: error.stack,
        userAgent: context.userAgent,
        ip: context.ip,
        userId: context.userId,
        sessionId: context.sessionId
      });
    } else {
      logger.logRequestEnd(context.method, context.url, statusCode, {
        requestId: context.requestId,
        userAgent: context.userAgent,
        ip: context.ip,
        userId: context.userId,
        sessionId: context.sessionId,
        startTime: context.startTime
      });
    }

    // Log slow requests as warnings
    if (duration > 5000) {
      logger.warn(`Slow request detected: ${context.method} ${context.url}`, {
        requestId: context.requestId,
        duration,
        statusCode,
        context: 'performance'
      });
    }
  }

  /**
   * Middleware wrapper for API routes
   */
  static wrap<T extends unknown[]>(
    handler: (request: NextRequest, ...args: T) => Promise<NextResponse | Response>
  ) {
    return async (request: NextRequest, ...args: T): Promise<NextResponse | Response> => {
      const context = RequestLogger.createContext(request);
      RequestLogger.logStart(context);

      try {
        const response = await handler(request, ...args);
        RequestLogger.logEnd(context, response);
        
        const headers = new Headers(response.headers);
        headers.set('X-Request-ID', context.requestId);
        
        return new NextResponse(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers
        });
      } catch (error) {
        const errorResponse = NextResponse.json(
          { 
            error: 'Internal Server Error',
            requestId: context.requestId
          },
          { status: 500 }
        );
        
        RequestLogger.logEnd(context, errorResponse, error as Error);
        return errorResponse;
      }
    };
  }

  /**
   * Simple logging utility for manual use in API routes
   */
  static logOperation(
    context: RequestLogContext,
    operation: string,
    metadata: Record<string, unknown> = {}
  ): void {
    logger.info(`${operation}`, {
      requestId: context.requestId,
      context: 'api',
      operation,
      ...metadata
    });
  }

  /**
   * Log database operations within a request context
   */
  static logDatabaseOperation(
    context: RequestLogContext,
    query: string,
    duration: number,
    metadata: Record<string, unknown> = {}
  ): void {
    logger.databaseQuery(query, duration, {
      requestId: context.requestId,
      ...metadata
    });
  }

  /**
   * Log authentication events
   */
  static logAuthEvent(
    context: RequestLogContext,
    event: 'login' | 'logout' | 'failed_login' | 'token_refresh',
    userId?: string,
    metadata: Record<string, unknown> = {}
  ): void {
    const isSecurityEvent = event === 'failed_login';
    const logMethod = isSecurityEvent ? logger.security.bind(logger) : logger.audit.bind(logger);
    
    logMethod(`Authentication event: ${event}`, {
      requestId: context.requestId,
      userId: userId || context.userId,
      event,
      ip: context.ip,
      userAgent: context.userAgent,
      ...metadata
    });
  }
} 