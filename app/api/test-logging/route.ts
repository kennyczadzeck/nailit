import { NextRequest, NextResponse } from 'next/server';
import { logger } from '../../lib/logger';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestId = `test-${Date.now()}`;
  
  try {
    const results: string[] = [];

    // Test 1: Basic logging methods
    logger.info('Logging test started', { requestId, context: 'api' });
    results.push('✅ Basic info logging');

    logger.warn('Test warning message', { requestId, warning: 'test-warning' });
    results.push('✅ Warning logging');

    logger.debug('Test debug message', { requestId, details: 'debug-details' });
    results.push('✅ Debug logging');

    // Test 2: Performance logging
    const startTime = Date.now();
    await new Promise(resolve => setTimeout(resolve, 150)); // Simulate work
    const duration = Date.now() - startTime;
    
    logger.performance('Simulated operation completed', duration, {
      requestId,
      operation: 'api-test',
      success: true
    });
    results.push('✅ Performance logging');

    // Test 3: Security audit logging
    logger.audit('Test API endpoint accessed', {
      requestId,
      userId: 'test-user-123',
      action: 'logging-test-executed'
    });
    results.push('✅ Audit logging');

    // Test 4: Context-specific logging
    logger.emailProcessing('simulated', 'test-email-123', {
      requestId,
      processor: 'test-simulation'
    });
    results.push('✅ Email processing logging');

    logger.aiAnalysis('test-model', 500, {
      requestId,
      operation: 'test-analysis',
      confidence: 0.95
    });
    results.push('✅ AI analysis logging');

    // Test 5: Database operation logging
    logger.databaseQuery('SELECT * FROM test_table WHERE id = ?', 25, {
      requestId,
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
        requestId,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        intentional: true
      });
      results.push('✅ Error logging');
    }

    // Test 8: Security event
    logger.security('Test security event', {
      requestId,
      eventType: 'test-event',
      severity: 'low',
      description: 'Simulated security event for testing'
    });
    results.push('✅ Security event logging');

    // Response with test results
    return NextResponse.json({
      success: true,
      requestId,
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

  } catch (error) {
    logger.error('Logging test failed', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });

    return NextResponse.json({
      success: false,
      error: 'Logging test failed',
      details: error instanceof Error ? error.message : String(error),
      requestId
    }, { status: 500 });
  }
}

export const POST = GET;

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