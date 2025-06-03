# 🪵 Logging Implementation Guide

**Status:** ✅ IMPLEMENTED  
**Priority:** HIGH - Required before complex feature development

## 📋 Overview

This guide covers the structured logging implementation for NailIt, providing comprehensive observability across all environments. The logging system is designed for scalability, security, and production readiness.

**📖 Related Documentation:**
- [Logging Infrastructure User Stories](../requirements/user-stories/logging-infrastructure.md) - BDD requirements and acceptance criteria
- [Feature Development Playbook](./FEATURE_DEVELOPMENT_PLAYBOOK.md) - Development workflow process

## 🏗️ Architecture

### Core Components

1. **NailItLogger** (`app/lib/logger.ts`): Main logging class with Winston integration
2. **Request Logger** (`app/lib/request-logger.ts`): Middleware for automatic request tracing
3. **CloudWatch Integration**: AWS CloudWatch Logs for production monitoring
4. **Environment-Aware Configuration**: Different log levels and transports per environment

### Log Levels & Environments

| Environment | Log Level | Transports | CloudWatch |
|-------------|-----------|------------|------------|
| **Development** | `debug` | Console (pretty) | ❌ |
| **Test** | `debug` | Console (JSON) | ❌ |
| **Staging** | `debug` | Console + File | ✅ |
| **Production** | `info` | Console + File | ✅ |

## 🚀 Usage Examples

### Basic Logging

```typescript
import { logger } from '@/lib/logger';

// Basic log levels
logger.error('User authentication failed', { userId: '123', reason: 'invalid_token' });
logger.warn('High memory usage detected', { memoryUsage: process.memoryUsage() });
logger.info('Project created successfully', { projectId: 'proj_123', userId: 'user_456' });
logger.debug('Cache hit for user data', { userId: '123', cacheKey: 'user:profile' });
```

### API Route Logging

```typescript
// app/api/projects/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { withRequestLogging } from '@/lib/request-logger';
import { logger } from '@/lib/logger';

async function handleProjects(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();
  
  try {
    logger.info('Fetching projects for user', { 
      userId: 'user_123',
      context: 'api'
    });

    const projects = await prisma.project.findMany();
    const duration = Date.now() - startTime;
    
    logger.performance('Projects fetched successfully', duration, {
      projectCount: projects.length,
      userId: 'user_123'
    });

    return NextResponse.json(projects);
  } catch (error) {
    logger.error('Failed to fetch projects', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      userId: 'user_123',
      context: 'api'
    });
    
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Wrap with automatic request logging
export const GET = withRequestLogging(handleProjects);
```

### Database Operation Logging

```typescript
import { logDatabaseOperation } from '@/lib/request-logger';

async function createProject(data: ProjectData) {
  const startTime = Date.now();
  
  try {
    const project = await prisma.project.create({ data });
    const duration = Date.now() - startTime;
    
    logDatabaseOperation('CREATE', 'projects', duration, {
      projectId: project.id,
      userId: data.userId
    });
    
    return project;
  } catch (error) {
    const duration = Date.now() - startTime;
    
    logger.error('Database operation failed', {
      operation: 'CREATE',
      table: 'projects',
      duration,
      error: error instanceof Error ? error.message : String(error)
    });
    
    throw error;
  }
}
```

### Authentication & Security Logging

```typescript
import { logAuthEvent, logSecurityEvent } from '@/lib/request-logger';

// Authentication events
logAuthEvent('user_login_success', userId, { method: 'google_oauth' });
logAuthEvent('user_login_failed', undefined, { email: 'user@example.com', reason: 'invalid_credentials' });
logAuthEvent('user_logout', userId);

// Security events
logSecurityEvent('failed_login_attempts', 'medium', { 
  email: 'user@example.com', 
  attempts: 5, 
  ip: '192.168.1.1' 
});

logSecurityEvent('unauthorized_api_access', 'high', {
  endpoint: '/api/admin/users',
  ip: '192.168.1.1',
  userId: 'user_123'
});
```

### Email Processing Logging

```typescript
import { logger } from '@/lib/logger';

async function processEmail(emailId: string) {
  logger.emailProcessing('started', emailId, { 
    processor: 'ai_analysis',
    model: 'gpt-4'
  });

  try {
    const analysis = await analyzeEmailWithAI(email);
    
    logger.emailProcessing('completed', emailId, {
      processor: 'ai_analysis',
      relevanceScore: analysis.relevanceScore,
      classification: analysis.classification.category,
      tokensUsed: 1250
    });

    logger.aiAnalysis('gpt-4', 1250, {
      emailId,
      relevanceScore: analysis.relevanceScore,
      processingTime: Date.now() - startTime
    });

  } catch (error) {
    logger.emailProcessing('failed', emailId, {
      error: error instanceof Error ? error.message : String(error),
      processor: 'ai_analysis'
    });
  }
}
```

## 🔧 Configuration

### Environment Variables

```bash
# AWS CloudWatch (Production/Staging)
AWS_REGION=us-east-1
NODE_ENV=production

# Optional: Custom log level override
LOG_LEVEL=debug

# Optional: Disable CloudWatch
DISABLE_CLOUDWATCH_LOGS=true
```

### Log Directory Structure

```
logs/
├── application.log      # All application logs
├── error.log           # Error-level logs only
├── exceptions.log      # Uncaught exceptions
└── rejections.log      # Unhandled promise rejections
```

## 📊 Log Structure

All logs follow a consistent JSON structure:

```json
{
  "level": "info",
  "message": "Project created successfully",
  "metadata": {
    "projectId": "proj_123",
    "userId": "user_456",
    "context": "api",
    "requestId": "req_789",
    "duration": 150,
    "timestamp": "2025-06-03T02:30:45.123Z",
    "environment": "production",
    "nodeVersion": "v20.10.0",
    "memoryUsage": { "heapUsed": 50123456 }
  },
  "timestamp": "2025-06-03T02:30:45.123Z",
  "environment": "production",
  "service": "nailit",
  "version": "1.0.0"
}
```

## 🔍 Request Tracing

Every request gets a unique `requestId` that can be traced across all logs:

```bash
# Find all logs for a specific request
grep "req_abc123" logs/application.log

# In CloudWatch
filter @message like /req_abc123/
```

## 🛡️ Security & Privacy

### Automatic Data Sanitization

Sensitive data is automatically redacted:

```typescript
// Sensitive fields are automatically redacted
logger.info('User updated profile', {
  userId: 'user_123',
  password: 'secret123',    // Will be logged as '[REDACTED]'
  token: 'jwt_token',       // Will be logged as '[REDACTED]'
  email: 'user@example.com' // Will be logged normally
});
```

### Manual Sanitization

```typescript
import { logger } from '@/lib/logger';

const sensitiveData = {
  userId: 'user_123',
  creditCard: '4111-1111-1111-1111',
  ssn: '123-45-6789'
};

// Manually sanitize before logging
const sanitized = logger.sanitizeMetadata(sensitiveData);
logger.info('Processing payment', sanitized);
```

## 📈 Performance Monitoring

### Automatic Performance Tracking

```typescript
// Performance is automatically tracked with withRequestLogging
export const GET = withRequestLogging(async (request) => {
  // Your handler code
  // Performance metrics automatically logged
});
```

### Manual Performance Tracking

```typescript
import { logger } from '@/lib/logger';

const startTime = Date.now();

try {
  const result = await expensiveOperation();
  const duration = Date.now() - startTime;
  
  logger.performance('Expensive operation completed', duration, {
    operation: 'ai_analysis',
    itemsProcessed: result.length
  });
} catch (error) {
  const duration = Date.now() - startTime;
  
  logger.error('Expensive operation failed', {
    duration,
    operation: 'ai_analysis',
    error: error instanceof Error ? error.message : String(error)
  });
}
```

## 🌐 Production Monitoring

### CloudWatch Integration

In production and staging, logs are automatically sent to AWS CloudWatch Logs:

- **Log Group:** `/nailit/{environment}/application`
- **Log Stream:** `{date}-{random-id}`
- **Retention:** 30 days (configurable)

### CloudWatch Queries

```sql
-- Find all errors in the last 24 hours
filter @level = "error" | sort @timestamp desc | limit 100

-- Performance monitoring
filter @message like /performance/ | stats avg(metadata.duration) by bin(5m)

-- Security events
filter metadata.security_event = true | sort @timestamp desc

-- API endpoint performance
filter metadata.context = "api" 
| stats avg(metadata.duration), count() by metadata.endpoint
```

### Alerts & Monitoring

Set up CloudWatch Alarms for:

1. **Error Rate:** > 5% error responses
2. **High Latency:** API responses > 5 seconds
3. **Security Events:** Any critical security events
4. **Memory Usage:** > 80% memory utilization

## 🧪 Testing

### Log Testing in Jest

```typescript
// tests/logging.test.ts
import { logger } from '@/lib/logger';
import winston from 'winston';

// Mock winston for testing
jest.mock('winston');

describe('Logging', () => {
  test('should log API requests with correct format', () => {
    const mockLogger = jest.mocked(winston.createLogger);
    
    logger.apiRequest('POST', '/api/projects', 201, 150, {
      userId: 'user_123'
    });
    
    expect(mockLogger).toHaveBeenCalledWith(
      expect.objectContaining({
        level: 'info',
        message: 'POST /api/projects'
      })
    );
  });
});
```

## 📝 Best Practices

### DO ✅

1. **Use structured logging:** Always include relevant metadata
2. **Log at appropriate levels:** Error for failures, Info for business events, Debug for development
3. **Include request IDs:** For tracing requests across services
4. **Log performance metrics:** Duration, memory usage, etc.
5. **Sanitize sensitive data:** Never log passwords, tokens, etc.

### DON'T ❌

1. **Use console.log in production:** Use the logger instead
2. **Log large objects:** Truncate or summarize large data
3. **Log in tight loops:** Can impact performance
4. **Ignore log levels:** Don't log debug messages as errors
5. **Log sensitive data:** Always sanitize first

## 🚀 Migration Guide

### Step 1: Replace Console Statements

**Before:**
```typescript
console.log('User created:', user);
console.error('Database error:', error);
```

**After:**
```typescript
import { logger } from '@/lib/logger';

logger.info('User created successfully', { 
  userId: user.id, 
  email: user.email 
});

logger.error('Database operation failed', {
  operation: 'user_creation',
  error: error.message,
  stack: error.stack
});
```

### Step 2: Add Request Logging

**Before:**
```typescript
export async function GET(request: NextRequest) {
  // Handler code
}
```

**After:**
```typescript
import { withRequestLogging } from '@/lib/request-logger';

async function handleGet(request: NextRequest) {
  // Handler code
}

export const GET = withRequestLogging(handleGet);
```

### Step 3: Add Context-Specific Logging

```typescript
// Authentication
import { logAuthEvent } from '@/lib/request-logger';
logAuthEvent('user_login_success', userId);

// Database operations
import { logDatabaseOperation } from '@/lib/request-logger';
logDatabaseOperation('CREATE', 'projects', duration);

// Email processing
logger.emailProcessing('started', emailId);
```

## 🎯 Next Steps

After implementing logging:

1. **Monitor Production:** Set up CloudWatch dashboards
2. **Create Alerts:** Configure alerts for errors and performance
3. **Log Analysis:** Use log data to optimize performance
4. **Security Monitoring:** Track authentication and security events
5. **Continuous Improvement:** Refine logging based on operational needs

---

**✅ With proper logging in place, you're ready for complex feature development with full observability and debugging capabilities.** 

# Production-Ready Logging Infrastructure Implementation Guide

## Overview

This guide documents the implementation of comprehensive logging infrastructure for the NailIt construction project management platform. The implementation follows the user stories and acceptance criteria defined in [Logging Infrastructure User Stories](../requirements/user-stories/logging-infrastructure.md).

## Implementation Summary 