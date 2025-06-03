import { NextRequest, NextResponse } from 'next/server';
import { logger, LogMetadata } from './logger';
import { v4 as uuidv4 } from 'uuid';

export function generateRequestId(): string {
  return uuidv4();
}

export function extractRequestMetadata(request: NextRequest): LogMetadata {
  const userAgent = request.headers.get('user-agent') || 'unknown';
  const ip = request.headers.get('x-forwarded-for') || 
            request.headers.get('x-real-ip') || 
            'unknown';
  const method = request.method;
  const url = request.url;

  return {
    method,
    endpoint: url,
    userAgent,
    ip,
    headers: Object.fromEntries(request.headers.entries()),
  };
}

export function withRequestLogging<T extends any[]>(
  handler: (request: NextRequest, ...args: T) => Promise<NextResponse>
) {
  return async (request: NextRequest, ...args: T): Promise<NextResponse> => {
    const requestId = generateRequestId();
    const startTime = Date.now();
    const requestMetadata = extractRequestMetadata(request);

    // Add request ID to headers for tracing
    const enhancedMetadata: LogMetadata = {
      ...requestMetadata,
      requestId,
      startTime,
    };

    logger.logRequestStart(request.method, request.url, enhancedMetadata);

    try {
      const response = await handler(request, ...args);
      const duration = Date.now() - startTime;

      logger.logRequestEnd(
        request.method,
        request.url,
        response.status,
        {
          ...enhancedMetadata,
          duration,
          responseSize: response.headers.get('content-length') || 'unknown',
        }
      );

      // Add request ID to response headers for debugging
      response.headers.set('x-request-id', requestId);

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      logger.error('Request failed with unhandled error', {
        ...enhancedMetadata,
        error: error instanceof Error ? error.message : String(error),
        duration,
        stack: error instanceof Error ? error.stack : undefined,
      });

      // Re-throw the error to maintain normal error handling
      throw error;
    }
  };
}

// Utility for API route handlers
export function logApiCall(
  method: string,
  endpoint: string,
  statusCode: number,
  metadata: LogMetadata = {}
): void {
  const level = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
  const duration = metadata.startTime ? Date.now() - metadata.startTime : undefined;
  
  logger.apiRequest(method, endpoint, statusCode, duration || 0, metadata);
}

// Database operation logging
export function logDatabaseOperation(
  operation: string,
  table: string,
  duration: number,
  metadata: LogMetadata = {}
): void {
  logger.databaseQuery(`${operation} on ${table}`, duration, {
    ...metadata,
    operation,
    table,
  });
}

// Authentication logging
export function logAuthEvent(
  event: string,
  userId?: string,
  metadata: LogMetadata = {}
): void {
  logger.audit(`Authentication: ${event}`, {
    ...metadata,
    userId,
    context: 'auth',
  });
}

// Security event logging
export function logSecurityEvent(
  event: string,
  severity: 'low' | 'medium' | 'high' | 'critical',
  metadata: LogMetadata = {}
): void {
  logger.security(`Security Event: ${event}`, {
    ...metadata,
    severity,
    security_alert: true,
  });
} 