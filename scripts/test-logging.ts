// Test script for logging infrastructure
// Run with: npx tsx scripts/test-logging.ts

import { logger } from '../app/lib/logger';
import { RequestLogger } from '../app/lib/request-logger';

console.log('🧪 Testing NailIt Logging Infrastructure\n');

// Test 1: Basic Logging Methods
console.log('📝 Test 1: Basic Logging Methods');
logger.info('Test info message', { testId: 'basic-001', component: 'test-script' });
logger.warn('Test warning message', { testId: 'basic-002', issue: 'test-warning' });
logger.error('Test error message', { testId: 'basic-003', error: 'test-error' });
logger.debug('Test debug message', { testId: 'basic-004', details: 'debug-info' });

// Test 2: Specialized Logging Methods
console.log('\n🔒 Test 2: Security & Performance Logging');
logger.security('Test security event', { 
  testId: 'security-001', 
  userId: 'test-user-123',
  action: 'suspicious-activity'
});

logger.performance('Test performance metric', 1250, {
  testId: 'perf-001',
  operation: 'database-query',
  recordCount: 150
});

logger.audit('Test audit action', {
  testId: 'audit-001',
  userId: 'test-user-123',
  action: 'user-created'
});

// Test 3: API Request Logging
console.log('\n🌐 Test 3: API Request Logging');
logger.apiRequest('POST', '/api/projects', 201, 850, {
  testId: 'api-001',
  userId: 'test-user-123',
  projectId: 'proj-test-456'
});

logger.apiRequest('GET', '/api/projects', 500, 2500, {
  testId: 'api-002',
  error: 'database-connection-failed'
});

// Test 4: Context-Specific Logging
console.log('\n📧 Test 4: Context-Specific Logging');
logger.emailProcessing('started', 'email-test-789', {
  testId: 'email-001',
  processor: 'ai-analysis'
});

logger.aiAnalysis('gpt-4', 2100, {
  testId: 'ai-001',
  emailId: 'email-test-789',
  relevanceScore: 0.87
});

logger.databaseQuery('SELECT * FROM projects WHERE userId = ?', 45, {
  testId: 'db-001',
  userId: 'test-user-123'
});

// Test 5: Data Sanitization
console.log('\n🛡️  Test 5: Data Sanitization');
const sensitiveData = {
  userId: 'test-user-123',
  password: 'super-secret-password',
  token: 'jwt-token-12345',
  email: 'user@example.com',
  nested: {
    apiKey: 'secret-api-key',
    publicInfo: 'this-should-remain'
  }
};

logger.info('Testing data sanitization', sensitiveData);

// Test 6: Request Context (Simulated)
console.log('\n🔄 Test 6: Request Context Simulation');
const mockRequest = {
  url: 'http://localhost:3000/api/test',
  method: 'POST',
  headers: {
    get: (name: string) => {
      const headers: Record<string, string> = {
        'user-agent': 'Mozilla/5.0 (Test Browser)',
        'x-forwarded-for': '192.168.1.100'
      };
      return headers[name] || null;
    }
  }
} as any;

const context = RequestLogger.createContext(mockRequest);
RequestLogger.logStart(context);

// Simulate some processing
setTimeout(() => {
  const mockResponse = { status: 200 } as any;
  RequestLogger.logEnd(context, mockResponse);
}, 100);

// Test 7: Environment Configuration Check
console.log('\n⚙️  Test 7: Environment Configuration');
console.log(`NODE_ENV: ${process.env.NODE_ENV || 'NOT_SET'}`);
console.log(`NAILIT_AWS_REGION: ${process.env.NAILIT_AWS_REGION || 'NOT_SET'}`);
console.log(`LOG_LEVEL: ${process.env.LOG_LEVEL || 'environment-default'}`);
console.log(`DISABLE_CLOUDWATCH_LOGS: ${process.env.DISABLE_CLOUDWATCH_LOGS || 'false'}`);

// Test 8: Error Handling
console.log('\n💥 Test 8: Error Handling');
try {
  throw new Error('Simulated error for testing');
} catch (error) {
  logger.error('Caught and logged error', {
    testId: 'error-001',
    error: error instanceof Error ? error.message : String(error),
    stack: error instanceof Error ? error.stack : undefined
  });
}

console.log('\n✅ Logging tests completed! Check logs/ directory for output files.');
console.log('📊 Check console output for development formatting.');
console.log('🔍 In staging/production, logs will be JSON formatted and sent to CloudWatch.\n'); 