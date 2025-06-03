# Logging Infrastructure Setup Guide

This guide covers the AWS infrastructure setup required for the NailIt logging system.

## Overview

The logging infrastructure provides:
- **CloudWatch Log Groups** for structured log storage
- **IAM Roles & Policies** for secure access
- **Metric Filters** for monitoring and alerting
- **Environment-specific configuration** for dev/staging/production

## Required AWS Resources

### 1. CloudWatch Log Groups

The application creates logs in these CloudWatch Log Groups:
- `/nailit/{environment}/application` - Main application logs
- `/nailit/{environment}/errors` - Error-specific logs  
- `/nailit/{environment}/security` - Security audit logs
- `/nailit/{environment}/performance` - Performance monitoring

### 2. IAM Permissions

The application needs these CloudWatch Logs permissions:
- `logs:CreateLogGroup`
- `logs:CreateLogStream` 
- `logs:PutLogEvents`
- `logs:DescribeLogGroups`
- `logs:DescribeLogStreams`

## Deployment Options

### Option 1: CDK Deployment (Recommended)

Deploy the dedicated logging stack:

```bash
cd infrastructure

# Install dependencies
npm install

# Deploy logging infrastructure to staging
npm run deploy:staging-logging

# Deploy logging infrastructure to production  
npm run deploy:prod-logging
```

The logging stack creates:
- ✅ CloudWatch Log Groups with appropriate retention
- ✅ IAM Role with logging permissions
- ✅ Metric filters for monitoring
- ✅ CloudWatch alarms for error rates

### Option 2: Manual AWS Console Setup

If you prefer manual setup:

#### 2.1 Create Log Groups

In AWS CloudWatch Console:
1. Go to **CloudWatch > Log groups**
2. Create these log groups:
   - `/nailit/staging/application` (retention: 14 days)
   - `/nailit/staging/errors` (retention: 30 days)
   - `/nailit/staging/security` (retention: 365 days)
   - `/nailit/staging/performance` (retention: 7 days)
   - `/nailit/production/application` (retention: 30 days)
   - `/nailit/production/errors` (retention: 90 days)
   - `/nailit/production/security` (retention: 365 days)
   - `/nailit/production/performance` (retention: 30 days)

#### 2.2 Create IAM Policy

Create an IAM policy with these permissions:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": [
        "arn:aws:logs:*:*:log-group:/nailit/staging/*",
        "arn:aws:logs:*:*:log-group:/nailit/staging/*:*",
        "arn:aws:logs:*:*:log-group:/nailit/production/*",
        "arn:aws:logs:*:*:log-group:/nailit/production/*:*"
      ]
    }
  ]
}
```

#### 2.3 Attach to Amplify Service Role

1. Go to **IAM > Roles**
2. Find your Amplify service role
3. Attach the logging policy

### Option 3: Auto-Creation (Limited)

The application can auto-create log groups, but this requires broader permissions:
- Set `AWS_REGION` environment variable
- Ensure IAM role has `logs:CreateLogGroup` permission
- Log groups will use default retention (never expire)

## Environment Configuration

### Required Environment Variables

Add these to your Amplify environment variables:

```bash
# Required for CloudWatch integration
AWS_REGION=us-east-1

# Optional: Override default log level
LOG_LEVEL=info

# Optional: Disable CloudWatch (for testing)
DISABLE_CLOUDWATCH_LOGS=false
```

### Amplify Configuration

In your Amplify console:
1. Go to **App settings > Environment variables**
2. Add the environment variables above
3. Ensure the service role has logging permissions

## Monitoring & Alerting

### CloudWatch Dashboards

The CDK stack creates metric filters that can be used in dashboards:
- `NailIt/Application/ErrorRate` - Application error rate
- `NailIt/Security/SecurityEvents` - Security event count
- `NailIt/Performance/SlowRequests` - Slow request count

### Recommended Alarms

Set up CloudWatch Alarms for:

1. **High Error Rate**
   - Metric: `NailIt/Application/ErrorRate`
   - Threshold: > 5 errors in 5 minutes
   - Action: Send SNS notification

2. **Security Events**
   - Metric: `NailIt/Security/SecurityEvents`
   - Threshold: > 0 events in 1 minute
   - Action: Send immediate notification

3. **Performance Issues**
   - Metric: `NailIt/Performance/SlowRequests`
   - Threshold: > 10 slow requests in 5 minutes
   - Action: Send SNS notification

### Sample CloudWatch Queries

Use these queries in CloudWatch Logs Insights:

```sql
-- Find all errors in the last 24 hours
filter @level = "error" 
| sort @timestamp desc 
| limit 100

-- Monitor API performance
filter metadata.context = "api" 
| stats avg(metadata.duration), count() by metadata.endpoint

-- Security audit
filter metadata.security_event = true 
| sort @timestamp desc

-- User activity tracking  
filter metadata.userId exists
| stats count() by metadata.userId
| sort count desc
```

## Cost Optimization

### Log Retention Policies

- **Development**: 7-14 days
- **Staging**: 14-30 days  
- **Production**: 30-90 days
- **Security Logs**: 365 days (compliance)

### Log Volume Management

- Use appropriate log levels per environment
- Implement log sampling for high-volume events
- Consider archiving to S3 for long-term storage

## Troubleshooting

### Common Issues

**1. "Access Denied" errors**
- Check IAM role has CloudWatch Logs permissions
- Verify log group names match application configuration
- Ensure AWS_REGION is set correctly

**2. Logs not appearing in CloudWatch**
- Check AWS credentials are configured
- Verify environment variables are set
- Look for errors in application logs

**3. High CloudWatch costs**
- Review log retention policies
- Check for excessive log volume
- Consider reducing log level in production

### Testing Logging

Test the logging setup:

```typescript
// In your Next.js application
import { logger } from '@/lib/logger';

// Test basic logging
logger.info('Testing CloudWatch integration', { 
  testId: 'log-test-001',
  environment: process.env.NODE_ENV 
});

// Test error logging (will send to CloudWatch)
logger.error('Test error for CloudWatch', {
  testId: 'error-test-001',
  intentional: true
});
```

Check CloudWatch Logs console within 1-2 minutes for the logs.

## Security Considerations

1. **IAM Principle of Least Privilege**
   - Only grant necessary permissions
   - Use resource-specific ARNs
   - Regularly audit permissions

2. **Log Data Privacy**
   - Sensitive data is automatically sanitized
   - Review log content for compliance
   - Consider encryption at rest

3. **Access Control**
   - Limit CloudWatch Logs access
   - Use IAM policies for read access
   - Monitor log access patterns

## Next Steps

After deployment:
1. **Test the integration** with sample logs
2. **Set up monitoring dashboards**
3. **Configure alerting** for critical events
4. **Review and optimize** log retention policies
5. **Train team** on CloudWatch Logs usage

---

✅ **Your logging infrastructure is now ready for production monitoring and debugging!** 