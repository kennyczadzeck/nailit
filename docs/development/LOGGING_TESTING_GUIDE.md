# Logging Infrastructure Testing Guide

This guide provides comprehensive testing strategies for validating the logging infrastructure before promoting to staging.

## 🧪 Testing Strategy Overview

### Test Phases
1. **Local Development Testing** - Verify basic functionality
2. **Development Environment Testing** - Test in deployed environment  
3. **Integration Testing** - Verify all components work together
4. **Pre-Staging Validation** - Final checks before promotion

## 📋 Phase 1: Local Development Testing

### Prerequisites
```bash
npm install
npm install -g tsx  # For running TypeScript scripts
```

### Test 1: Run Logging Test Script

```bash
# Run comprehensive logging test
npx tsx scripts/test-logging.ts
```

**Expected Results:**
- ✅ Console output with formatted logs
- ✅ File logs created in `logs/` directory (if NODE_ENV != 'development')
- ✅ No CloudWatch attempts (development environment)
- ✅ Data sanitization working (passwords/tokens redacted)

### Test 2: Unit Tests

```bash
# Run existing unit tests (should still pass)
npm test

# Run TypeScript compilation check
npm run type-check

# Run linting check
npm run lint
```

**Expected Results:**
- ✅ All existing tests pass
- ✅ No TypeScript errors
- ✅ No linting errors

### Test 3: Manual API Testing

Start your development server and test the logging API:

```bash
npm run dev

# Test the logging endpoint
curl http://localhost:3000/api/test-logging

# Check debug environment
curl http://localhost:3000/api/debug-env
```

**Expected Results:**
```json
{
  "success": true,
  "testsCompleted": 8,
  "environmentInfo": {
    "nodeEnv": "development",
    "willLogToCloudWatch": false
  }
}
```

## 🌐 Phase 2: Development Environment Testing

### Deploy to Development Branch

Ensure your feature branch is deployed to the development environment:
```bash
git push origin feature/logging-infrastructure
```

### Test 1: Environment Configuration

Visit your development environment:
```
https://develop.d1rq0k9js5lwg3.amplifyapp.com/api/debug-env
```

**Verify:**
```json
{
  "logging": {
    "region": "us-east-1",
    "logLevel": "environment-default",
    "cloudWatchDisabled": false,
    "nodeEnv": "development", 
    "cloudWatchConfigured": true,
    "willLogToCloudWatch": false
  }
}
```

### Test 2: Live Logging Test

```bash
# Test logging functionality
curl https://develop.d1rq0k9js5lwg3.amplifyapp.com/api/test-logging
```

**Expected Results:**
- ✅ All 8 tests complete successfully
- ✅ `willLogToCloudWatch: false` (development safety)
- ✅ Request ID generated and tracked
- ✅ No CloudWatch errors in logs

### Test 3: Application Integration

Test logging in real application flows:

1. **Create a project** - Verify API request logging
2. **Navigate pages** - Check performance logging
3. **Trigger an error** - Verify error handling
4. **Check console logs** - Verify request tracing

## 🔗 Phase 3: Integration Testing

### Test 1: Request Tracing

Make multiple API calls and verify request tracing:

```bash
# Multiple requests to trace
for i in {1..3}; do
  curl -H "X-Test-Request: $i" \
    https://develop.d1rq0k9js5lwg3.amplifyapp.com/api/test-logging
done
```

**Verify:**
- ✅ Each request has unique `requestId`
- ✅ Start and end logs for each request
- ✅ Performance metrics captured
- ✅ Error logs include request context

### Test 2: Data Sanitization

```bash
# Test with simulated sensitive data
curl -X POST https://develop.d1rq0k9js5lwg3.amplifyapp.com/api/test-logging \
  -H "Content-Type: application/json" \
  -d '{"password": "should-be-hidden", "email": "test@example.com"}'
```

**Verify:**
- ✅ Passwords redacted as `[REDACTED]`
- ✅ Tokens/keys sanitized
- ✅ Normal data preserved

### Test 3: Performance Under Load

```bash
# Simple load test
for i in {1..10}; do
  curl https://develop.d1rq0k9js5lwg3.amplifyapp.com/api/test-logging &
done
wait
```

**Verify:**
- ✅ No performance degradation
- ✅ All requests complete successfully
- ✅ Logging doesn't impact application performance

## ✅ Phase 4: Pre-Staging Validation

### Final Checklist

Before promoting to staging, verify:

#### Environment Configuration
- [ ] `NAILIT_AWS_REGION=us-east-1` set in Amplify
- [ ] Debug endpoint shows correct logging config
- [ ] No CloudWatch logs in development (safety check)

#### Code Quality
- [ ] All tests passing
- [ ] No linting errors
- [ ] TypeScript compilation successful
- [ ] No console.log statements remaining in production code

#### Functionality Tests
- [ ] `/api/test-logging` completes all 8 tests
- [ ] Request tracing working (unique IDs generated)
- [ ] Data sanitization working (sensitive data redacted)
- [ ] Error handling working (errors logged with context)
- [ ] Performance logging working (durations captured)

#### Documentation
- [ ] User stories completed
- [ ] Implementation guide updated
- [ ] AWS infrastructure ready
- [ ] Testing guide complete

### AWS Infrastructure Pre-Check

Before promoting to staging, you may want to deploy the AWS logging infrastructure:

```bash
cd infrastructure

# Deploy logging infrastructure to staging (optional)
npm run deploy:staging-logging
```

This creates:
- CloudWatch Log Groups with appropriate retention
- IAM roles with logging permissions
- Metric filters for monitoring

## 🚀 Promotion to Staging

Once all tests pass, you can:

1. **Create Pull Request** from feature branch
2. **Merge to develop** (triggers staging deployment)
3. **Verify staging environment** with same tests
4. **Enable CloudWatch logging** in staging
5. **Monitor CloudWatch Logs** for real data

## 🔍 Staging Environment Testing

After promotion to staging:

### Test CloudWatch Integration

```bash
# Test staging with CloudWatch enabled
curl https://staging.d1rq0k9js5lwg3.amplifyapp.com/api/test-logging
```

**Then check:**
1. **CloudWatch Console** → Log groups → `/nailit/staging/application`
2. **Verify logs appear** within 1-2 minutes
3. **Test log queries** using CloudWatch Logs Insights
4. **Check metric filters** are capturing data

### Sample CloudWatch Query

```sql
filter @message like /test-/
| sort @timestamp desc
| limit 20
```

## 🚨 Troubleshooting

### Common Issues

**No logs in CloudWatch:**
- Check `NAILIT_AWS_REGION` is set
- Verify IAM permissions
- Confirm environment is not development

**Performance issues:**
- Check log volume
- Verify file logging not overwhelming disk
- Monitor memory usage

**Missing request IDs:**
- Verify RequestLogger.wrap() is used
- Check request context creation
- Validate UUID generation

### Debug Commands

```bash
# Check environment variables
curl https://your-env.amplifyapp.com/api/debug-env

# Test specific logging functionality  
curl https://your-env.amplifyapp.com/api/test-logging

# Check all environment variables
curl https://your-env.amplifyapp.com/api/debug-all-env
```

## ✨ Success Criteria

The logging infrastructure is ready for staging when:

- ✅ All local tests pass
- ✅ Development environment tests pass
- ✅ Request tracing works correctly
- ✅ Data sanitization protects sensitive data
- ✅ Performance impact is minimal
- ✅ Error handling captures all necessary context
- ✅ Documentation is complete
- ✅ AWS infrastructure is ready

---

**🎯 Ready for staging? Your logging infrastructure provides full observability for complex feature development!** 