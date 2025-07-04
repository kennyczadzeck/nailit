# 🕐 Historical Email Ingestion Testing Strategy

## 📋 **Overview**

This document outlines the comprehensive testing strategy for historical email ingestion - a critical feature that enables homeowners to import existing project emails when they start using NailIt after their renovation project has already begun.

**Critical Use Case**: Homeowners who have 3-12 months of existing renovation emails in their Gmail/Outlook accounts need to import this history to get complete project communication tracking.

---

## 🎯 **Testing Objectives**

### **Primary Goals**
1. **Bulk Processing Reliability** - Handle 500-1500 emails without data loss
2. **Rate Limiting Compliance** - Stay within Gmail API quotas (250 units/user/second)
3. **Performance Standards** - Complete 500 email import within 2 hours
4. **User Experience** - Provide accurate progress tracking and error handling
5. **Data Integrity** - Ensure historical emails integrate seamlessly with real-time processing

### **Success Metrics**
- **Throughput**: Process 150+ emails per hour sustained
- **Accuracy**: >90% project relevance detection for historical emails
- **Reliability**: <1% email processing failure rate
- **Performance**: <2 hours for 500 email import
- **Integration**: Historical and real-time emails appear unified in timeline

---

## 🧪 **Test Scenarios**

### **Scenario 1: Mid-Project Homeowner Onboarding**
**Context**: Homeowner starts using NailIt 4 months into kitchen renovation

**Test Setup**:
```bash
# Generate realistic 4-month historical dataset
npm run test:create-historical-dataset \
  --scenario="mid-project-kitchen" \
  --duration="4-months" \
  --contractors=3 \
  --email-types="quotes,invoices,schedule-updates,change-orders" \
  --volume="realistic" # ~20 emails/week

# Execute historical import
npm run test:historical-import \
  --project-id="kitchen-renovation-test" \
  --date-range="2024-09-01,2025-01-01" \
  --batch-size=50
```

**Validation**:
- [ ] 320+ emails discovered from 4-month period
- [ ] AI filters out personal emails, keeps renovation emails
- [ ] Progress tracking shows accurate completion estimates
- [ ] All emails appear in project timeline chronologically
- [ ] 15+ flagged items automatically created from historical emails

### **Scenario 2: Large Scale Historical Processing**
**Context**: Homeowner with 12-month full house renovation history

**Test Setup**:
```bash
# Generate large-scale historical dataset
npm run test:create-large-historical-dataset \
  --emails=1200 \
  --timespan="12-months" \
  --contractors=8 \
  --realistic-distribution=true

# Test performance under load
npm run test:historical-batch-processing \
  --batch-size=100 \
  --concurrent-jobs=2 \
  --timeout="3-hours"
```

**Validation**:
- [ ] Process 1200+ emails within 3 hours
- [ ] Gmail API quotas never exceeded
- [ ] Database performance remains stable
- [ ] Memory usage stays within acceptable limits
- [ ] No duplicate emails created

### **Scenario 3: Mixed Provider Historical Import**
**Context**: Homeowner using both Gmail (personal) and Outlook (work) for project

**Test Setup**:
```bash
# Set up historical data across providers
npm run test:setup-mixed-historical \
  --gmail-emails=300 \
  --outlook-emails=200 \
  --overlap-percentage=5 # Some emails forwarded between accounts

# Test unified historical import
npm run test:mixed-provider-import \
  --providers="gmail,outlook" \
  --deduplication=true
```

**Validation**:
- [ ] Both providers processed independently
- [ ] Duplicate emails identified and merged
- [ ] Unified timeline shows chronological order across providers
- [ ] Provider-specific metadata preserved

### **Scenario 4: Error Recovery and Resilience**
**Context**: Testing robustness under various failure conditions

**Test Setup**:
```bash
# Test various error scenarios
npm run test:historical-error-scenarios \
  --scenarios="oauth-expiry,rate-limit,network-timeout,partial-failures"

# Test recovery mechanisms
npm run test:historical-recovery \
  --resume-from-failure=true \
  --validate-data-integrity=true
```

**Validation**:
- [ ] OAuth token refresh works automatically
- [ ] Rate limiting triggers appropriate backoff
- [ ] Network timeouts retry with exponential backoff
- [ ] Partial batch failures don't corrupt entire import
- [ ] Resume functionality works from last successful batch

---

## 🔄 **API Testing Strategy**

### **Historical Import API Endpoints**

#### **POST /api/email/import/historical**
**Purpose**: Initiate historical email import for a project

```bash
# Test historical import initiation
curl -X POST http://localhost:3000/api/email/import/historical \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "projectId": "kitchen-reno-123",
    "dateRange": {
      "start": "2024-06-01",
      "end": "2024-12-31"
    },
    "providers": ["gmail"],
    "batchSize": 50,
    "includeAttachments": false
  }'

# Expected Response:
{
  "success": true,
  "importJobId": "import_abc123",
  "estimatedEmails": 245,
  "estimatedDuration": "45 minutes",
  "status": "queued"
}
```

#### **GET /api/email/import/status/{jobId}**
**Purpose**: Track progress of historical import job

```bash
# Check import progress
curl -X GET http://localhost:3000/api/email/import/status/import_abc123 \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected Response:
{
  "jobId": "import_abc123",
  "status": "processing",
  "progress": {
    "totalEmails": 245,
    "processedEmails": 127,
    "currentBatch": 3,
    "totalBatches": 5,
    "percentComplete": 51.8,
    "estimatedCompletion": "2025-01-15T14:30:00Z"
  },
  "errors": []
}
```

#### **POST /api/email/import/{jobId}/cancel**
**Purpose**: Cancel ongoing historical import

```bash
# Cancel import job
curl -X POST http://localhost:3000/api/email/import/import_abc123/cancel \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected Response:
{
  "success": true,
  "message": "Import job cancelled",
  "processedEmails": 127,
  "status": "cancelled"
}
```

---

## 📊 **Performance Testing**

### **Gmail API Rate Limiting Tests**

```bash
# Test quota compliance
npm run test:gmail-quota-compliance \
  --quota-limit=250-units-per-second \
  --test-duration=10-minutes \
  --concurrent-users=5

# Test backoff strategies
npm run test:rate-limit-backoff \
  --initial-delay=1000ms \
  --max-delay=60000ms \
  --backoff-multiplier=2 \
  --jitter=true
```

**Validation Criteria**:
- [ ] Never exceed 250 quota units/user/second
- [ ] Backoff delays increase appropriately when limits hit
- [ ] Processing resumes automatically when quotas reset
- [ ] Multiple users don't interfere with each other's quotas

### **Database Performance Tests**

```bash
# Test bulk insertion performance
npm run test:bulk-insert-performance \
  --email-count=1000 \
  --target-time="<60-seconds" \
  --concurrent-inserts=true

# Test query performance with large datasets
npm run test:historical-query-performance \
  --total-emails=5000 \
  --query-types="timeline,search,filter" \
  --target-time="<3-seconds"
```

**Performance Targets**:
- [ ] 1000 email bulk insert: <60 seconds
- [ ] Timeline query (5000 emails): <3 seconds
- [ ] Full-text search (5000 emails): <5 seconds
- [ ] Filtered queries: <2 seconds

### **Memory and Resource Tests**

```bash
# Monitor resource usage during bulk processing
npm run test:monitor-bulk-processing \
  --metrics="cpu,memory,database-connections,api-requests" \
  --email-count=1500 \
  --alert-thresholds="cpu:80%,memory:1GB"
```

**Resource Limits**:
- [ ] CPU usage: <80% sustained
- [ ] Memory usage: <1GB for 1500 email import
- [ ] Database connections: <10 concurrent
- [ ] No memory leaks during long-running imports

---

## 🛡️ **Error Handling & Recovery Testing**

### **OAuth Token Management**

```bash
# Test OAuth token refresh during import
npm run test:oauth-refresh-during-import \
  --simulate-token-expiry=true \
  --import-duration="90-minutes"

# Test OAuth revocation scenario
npm run test:oauth-revocation-handling \
  --revoke-during-import=true \
  --expected-behavior="graceful-stop"
```

### **Network Resilience**

```bash
# Test network interruption scenarios
npm run test:network-resilience \
  --interruption-types="timeout,connection-reset,dns-failure" \
  --recovery-strategies="retry,exponential-backoff,circuit-breaker"
```

### **Partial Failure Recovery**

```bash
# Test recovery from partial batch failures
npm run test:partial-failure-recovery \
  --failure-rate=5% \
  --recovery-mode="resume-from-last-successful" \
  --validate-no-duplicates=true
```

---

## 🧪 **BDD Test Implementation**

### **Feature: Historical Email Import**

```gherkin
Feature: Historical Email Import for Existing Projects
  As a homeowner who started my renovation before using NailIt
  I want to import my existing project emails
  So that I have a complete communication history

Background:
  Given I am a homeowner with an active renovation project
  And I have 6 months of renovation emails in my Gmail account
  And my Gmail account is connected to NailIt

Scenario: Successful Historical Email Import
  Given I have 300 renovation-related emails from the last 6 months
  When I click "Import Historical Emails" on my project settings
  And I select the date range "Last 6 months"
  And I confirm the import of 300 discovered emails
  Then the historical import process begins
  And I see progress updates every 30 seconds
  And all 300 emails are imported within 90 minutes
  And the emails appear in my project timeline chronologically
  And 25 flagged items are automatically created from the emails

Scenario: Rate Limiting During Import
  Given I start a historical import of 500 emails
  When the system encounters Gmail API rate limits
  Then the import process automatically implements backoff delays
  And I see a status message "Processing paused - respecting API limits"
  And the import continues when rate limits reset
  And no emails are lost or duplicated
  And the import completes successfully

Scenario: Import Progress Tracking
  Given I start a historical import of 400 emails
  When I navigate away from the import page
  And return 30 minutes later
  Then I see updated progress "Processing email 180 of 400"
  And the estimated completion time is accurate
  And I can see any errors that occurred
  And I can cancel the import if needed

Scenario: Import Error Recovery
  Given I start a historical import of 300 emails
  When my OAuth token expires during the import
  Then I am prompted to re-authenticate
  And after re-authentication, the import resumes
  And continues from where it left off
  And no emails are duplicated
  And the import completes successfully
```

---

## 📋 **Test Execution Checklist**

### **Pre-Test Setup**
- [ ] Test Gmail accounts set up with OAuth credentials
- [ ] Historical email datasets generated for various scenarios
- [ ] Database configured with EmailMessage schema
- [ ] SQS queues configured for background processing
- [ ] Monitoring tools configured for performance tracking

### **During Testing**
- [ ] Monitor Gmail API quota usage
- [ ] Track database performance metrics
- [ ] Validate progress tracking accuracy
- [ ] Test user interface responsiveness
- [ ] Verify error handling and recovery

### **Post-Test Validation**
- [ ] All historical emails imported correctly
- [ ] No duplicate emails created
- [ ] Flagged items generated appropriately
- [ ] Timeline displays unified view
- [ ] Performance metrics within targets
- [ ] Error logs reviewed and addressed

### **Regression Testing**
- [ ] Real-time email processing still works during/after historical import
- [ ] Existing project features unaffected
- [ ] User authentication and authorization intact
- [ ] No performance degradation in other system areas

---

## 🎯 **Success Criteria**

### **Functional Requirements**
✅ **Historical Discovery**: Identify 90%+ of relevant project emails from date range  
✅ **Bulk Processing**: Handle 500+ email import within 2 hours  
✅ **Progress Tracking**: Provide accurate completion estimates (±10%)  
✅ **Error Recovery**: Resume from failures without data loss  
✅ **Integration**: Historical emails appear unified with real-time emails  

### **Performance Requirements**
✅ **Throughput**: 150+ emails/hour sustained processing rate  
✅ **Rate Limiting**: Never exceed Gmail API quotas  
✅ **Resource Usage**: <1GB memory for 1500 email import  
✅ **Database Performance**: Timeline queries <3 seconds with 5000+ emails  

### **User Experience Requirements**
✅ **Progress Visibility**: Real-time progress updates during import  
✅ **Error Communication**: Clear error messages and recovery instructions  
✅ **Cancellation**: Ability to cancel import with clean state  
✅ **Integration**: Seamless integration with existing project interface  

---

**Last Updated**: January 15, 2025  
**Owner**: Email Processing Team  
**Status**: 🚧 In Development - Critical for Q1 2025 Launch 