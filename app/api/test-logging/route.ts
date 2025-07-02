import { NextRequest, NextResponse } from 'next/server';
import { RequestLogger } from '../../lib/request-logger';
import { logger } from '../../lib/logger';
import { withDebugSecurity, debugSecurityHeaders } from '../../lib/security-middleware';

async function handleLoggingTest(request: NextRequest): Promise<NextResponse> {
  const context = RequestLogger.createContext(request);
  RequestLogger.logStart(context);

  try {
    const testId = `test-${Date.now()}`;
    const results: string[] = [];

    // Test 1: Basic logging methods
    logger.info('Logging test started', { testId, context: 'api' });
    results.push('✅ Basic info logging');

    logger.warn('Test warning message', { testId, warning: 'test-warning' });
    results.push('✅ Warning logging');

    logger.debug('Test debug message', { testId, details: 'debug-details' });
    results.push('✅ Debug logging');

    // Test 2: Performance logging
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate work
    const duration = Date.now() - startTime;
    
    logger.performance('Simulated operation completed', duration, {
      testId,
      operation: 'api-test',
      success: true
    });
    results.push('✅ Performance logging');

    // Test 3: Security audit logging
    logger.audit('Test API endpoint accessed', {
      testId,
      userId: 'test-user-123',
      action: 'logging-test-executed'
    });
    results.push('✅ Audit logging');

    // Test 4: Context-specific logging
    logger.emailProcessing('simulated', 'test-email-123', {
      testId,
      processor: 'test-simulation'
    });
    results.push('✅ Email processing logging');

    logger.aiAnalysis('test-model', 500, {
      testId,
      operation: 'test-analysis',
      confidence: 0.95
    });
    results.push('✅ AI analysis logging');

    // Test 5: Database operation logging
    logger.databaseQuery('SELECT * FROM test_table WHERE id = ?', 25, {
      testId,
      operation: 'test-query'
    });
    results.push('✅ Database query logging');

    // Test 6: Data sanitization test
    const sensitiveData = {
      userId: 'test-user-123',
      password: 'should-be-redacted',
      token: 'secret-token-123',
      email: 'test@example.com',
      publicData: 'this-should-remain'
    };

    logger.info('Testing data sanitization', sensitiveData);
    results.push('✅ Data sanitization logging');

    // Test 7: Intentional error for error logging
    try {
      throw new Error('Intentional test error');
    } catch (error) {
      logger.error('Test error handling', {
        testId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        intentional: true
      });
      results.push('✅ Error logging');
    }

    // Test 8: Security event
    logger.security('Test security event', {
      testId,
      eventType: 'test-event',
      severity: 'low',
      description: 'Simulated security event for testing'
    });
    results.push('✅ Security event logging');

    // Response with test results
    const response = NextResponse.json({
      success: true,
      testId,
      message: 'Logging test completed successfully',
      testsCompleted: results.length,
      results,
      environmentInfo: {
        nodeEnv: process.env.NODE_ENV,
        nailItEnvironment: process.env.NAILIT_ENVIRONMENT,
        detectedEnvironment: detectEnvironment(),
        region: process.env.NAILIT_AWS_REGION || 'NOT_SET',
        logLevel: process.env.LOG_LEVEL || 'environment-default',
        cloudWatchDisabled: process.env.DISABLE_CLOUDWATCH_LOGS === 'true',
        willLogToCloudWatch: !!(
          process.env.NAILIT_AWS_REGION && 
          detectEnvironment() !== 'development' && 
          process.env.DISABLE_CLOUDWATCH_LOGS !== 'true'
        )
      },
      instructions: {
        checkLogs: [
          'Check console output for formatted logs',
          'Check logs/ directory for file outputs (non-development)',
          'Check CloudWatch Logs if in staging/production',
          'Verify /api/debug-env shows correct logging configuration'
        ]
      },
      timestamp: new Date().toISOString()
    });

    RequestLogger.logEnd(context, response);
    return response;

  } catch (error) {
    const errorResponse = NextResponse.json({
      success: false,
      error: 'Logging test failed',
      details: error instanceof Error ? error.message : String(error),
      testId: context.requestId
    }, { status: 500 });

    RequestLogger.logEnd(context, errorResponse, error as Error);
    return errorResponse;
  }
}

// Apply security first, then request logging
const securedLoggingTest = withDebugSecurity(handleLoggingTest);

export const GET = RequestLogger.wrap(securedLoggingTest);
export const POST = RequestLogger.wrap(securedLoggingTest);

/**
 * Detects the current environment - must match the logic in logger.ts
 */
function detectEnvironment(): string {
  // Primary: Use our custom environment variable
  const nailItEnv = process.env.NAILIT_ENVIRONMENT;
  
  if (nailItEnv) {
    switch (nailItEnv.toLowerCase()) {
      case 'development':
      case 'dev':
        return 'development';
      case 'staging':
      case 'stage':
        return 'staging';
      case 'production':
      case 'prod':
        return 'production';
      default:
        console.warn(`Unknown NAILIT_ENVIRONMENT: ${nailItEnv}, defaulting to development`);
        return 'development';
    }
  }
  
  // Fallback: NODE_ENV for local development
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === 'development' || nodeEnv === 'test') {
    return 'development';
  }
  
  // Default fallback
  return 'development';
} 