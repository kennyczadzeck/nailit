# 🧪 Email Testing Playbook

## 📧 Test Gmail Accounts

### Primary Test Accounts
- **Homeowner**: `nailit.test.homeowner@gmail.com` (Receives emails)
- **Contractor**: `nailit.test.contractor@gmail.com` (Sends emails)

### Account Purposes
- **Homeowner Account**: Target for email ingestion, webhook testing, timeline validation
- **Contractor Account**: Source for sending mock renovation emails, testing various scenarios

## 🔧 Dev Utilities

### OAuth Test Utility
Use the contractor account to programmatically send mock emails:

```bash
# Set up OAuth for contractor account
npm run test:oauth-setup contractor

# Send mock emails to homeowner
npm run test:send-mock-emails

# Send specific email scenario
npm run test:send-email "cost-change"
npm run test:send-email "schedule-delay" 
npm run test:send-email "material-substitute"
```

## 📥 Ingestion Testing

### Two Critical Testing Modes

#### 1. Historical Bulk Ingestion (NEW - CRITICAL FOR EXISTING PROJECTS)
Test processing existing emails from Gmail API in bulk:
```bash
# Clear test data
npm run test:truncate-data

# Generate realistic bidirectional conversation history (ENHANCED)
npm run test:send-conversations 20 180  # 20 conversation threads over 6 months
npm run test:send-bulk-emails 30 180   # Additional one-way contractor emails

# Test historical discovery and filtering
npm run test:discover-historical --date-range="6-months" --project-id="test-123"

# Run historical ingestion with progress tracking
npm run test:ingest-historical --batch-size=50 --rate-limit=100

# Validate bulk processing results (now includes homeowner replies)
npm run test:validate-ingestion --mode=historical --expected-count=480
```

#### 2. Bidirectional Conversation Testing (NEW - for Mid-Project Onboarding)
Test realistic conversation patterns between contractors and homeowners:
```bash
# Generate conversation threads for historical testing
npm run test:send-conversations 15 90  # 15 conversation threads over 3 months

# Test individual homeowner replies
npm run test:send-homeowner-reply homeowner-cost-approval
npm run test:send-homeowner-reply homeowner-schedule-concern

# Validate conversation threading and context
npm run test:validate-conversations --thread-count=15
```

#### 2. Real-time Webhook Ingestion  
Test live email processing via webhooks:
```bash
# Set up webhook subscription for homeowner account
npm run test:setup-webhook

# Send test email from contractor
npm run test:send-email "urgent-issue"

# Validate webhook processing (within 30 seconds)
npm run test:validate-webhook --timeout=30

# Check database for new EmailMessage record
npm run test:check-db --latest
```

## 🕐 **Historical Email Testing Scenarios**

### Scenario 1: "Mid-Project Onboarding"
Simulates homeowner joining NailIt after project has been running for months:

```bash
# Generate realistic historical email dataset
npm run test:create-historical-dataset \
  --scenario="mid-project" \
  --duration="4-months" \
  --contractors=3 \
  --email-types="quotes,invoices,schedule-updates,change-orders"

# Test historical import workflow
npm run test:historical-import-workflow \
  --user="nailit.test.homeowner@gmail.com" \
  --project-id="kitchen-renovation-123" \
  --date-range="2024-09-01,2025-01-01"

# Validate project timeline reconstruction
npm run test:validate-timeline-reconstruction \
  --expected-events=45 \
  --expected-flagged-items=12
```

### Scenario 2: "Large Scale Historical Processing"
Tests system performance with high-volume historical imports:

```bash
# Generate large historical dataset (1000+ emails)
npm run test:create-large-historical-dataset \
  --emails=1500 \
  --timespan="12-months" \
  --realistic-distribution=true

# Test batch processing performance
npm run test:historical-batch-processing \
  --batch-size=100 \
  --concurrent-jobs=3 \
  --timeout="2-hours"

# Monitor resource usage during bulk processing
npm run test:monitor-bulk-processing \
  --metrics="cpu,memory,database-connections,api-quotas"
```

### Scenario 3: "Mixed Provider Historical Import"
Tests historical import from both Gmail and Outlook:

```bash
# Set up historical data in both providers
npm run test:setup-mixed-historical \
  --gmail-emails=300 \
  --outlook-emails=200 \
  --overlap-percentage=10

# Test unified historical import
npm run test:mixed-provider-import \
  --providers="gmail,outlook" \
  --deduplication=true

# Validate unified timeline
npm run test:validate-mixed-timeline \
  --total-emails=450 \
  --duplicates-removed=50
```

## 🔄 **Historical Ingestion API Testing**

### Historical Import API Endpoint Testing
```bash
# Test historical import initiation
curl -X POST http://localhost:3000/api/email/import/historical \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -d '{
    "projectId": "test-project-123",
    "dateRange": {
      "start": "2024-06-01",
      "end": "2025-01-01"
    },
    "providers": ["gmail"],
    "batchSize": 50
  }'

# Check import job status
curl -X GET http://localhost:3000/api/email/import/status/job-456 \
  -H "Authorization: Bearer $JWT_TOKEN"

# Get import progress
curl -X GET http://localhost:3000/api/email/import/progress/job-456 \
  -H "Authorization: Bearer $JWT_TOKEN"
```

### Historical Processing Queue Testing
```bash
# Monitor SQS queue for historical processing jobs
npm run test:monitor-historical-queue \
  --queue="nailit-historical-email-processing" \
  --duration="30-minutes"

# Test queue worker performance
npm run test:queue-worker-performance \
  --worker-count=3 \
  --message-throughput=100-per-minute

# Test queue error handling and retries
npm run test:queue-error-scenarios \
  --scenarios="api-rate-limit,oauth-expiry,network-timeout"
```

## 📊 **Performance Testing for Historical Import**

### Gmail API Rate Limiting Tests
```bash
# Test compliance with Gmail API quotas
npm run test:gmail-quota-compliance \
  --quota-limit=250-units-per-second \
  --test-duration=10-minutes

# Test rate limiting backoff strategies
npm run test:rate-limit-backoff \
  --initial-delay=1000ms \
  --max-delay=30000ms \
  --backoff-multiplier=2
```

### Database Performance Tests
```bash
# Test bulk email insertion performance
npm run test:bulk-insert-performance \
  --email-count=1000 \
  --target-time="<30-seconds"

# Test timeline query performance with large datasets
npm run test:timeline-query-performance \
  --email-count=5000 \
  --query-time="<2-seconds"
```

## 🧪 **Historical Email BDD Tests**

### Feature: Historical Email Import
```gherkin
Feature: Historical Email Import for Existing Projects
  As a homeowner who started my renovation before using NailIt
  I want to import my existing project emails
  So that I have a complete communication history

Scenario: Discover Historical Project Emails
  Given I have a Gmail account with 6 months of renovation emails
  And I connect my Gmail to my existing kitchen renovation project
  When I click "Import Historical Emails"
  Then NailIt scans my Gmail for renovation-related emails
  And shows me a list of 150 discovered project emails
  And I can select the date range "Last 6 months"
  And I can review the list before importing

Scenario: Bulk Historical Email Processing
  Given I have selected 300 historical emails for import
  When I start the historical import process
  Then emails are processed in batches of 50
  And I see progress "Processing batch 3 of 6"
  And the import completes within 45 minutes
  And all 300 emails appear in my project timeline
  And 25 flagged items are automatically created from the emails

Scenario: Historical Import with API Rate Limiting
  Given I have 1000 historical emails to import
  When the import process encounters Gmail API rate limits
  Then the system automatically implements exponential backoff
  And continues processing when rate limits reset
  And no emails are lost or duplicated
  And the import eventually completes successfully
```

## 🗄️ Data Storage Testing

### PostgreSQL Email Storage
Test email metadata and content storage:
```bash
# Check EmailMessage table
npm run test:query-emails

# Validate email content storage
npm run test:validate-content

# Test search functionality
npm run test:search-emails --query="cost increase"
```

### S3 Attachment Storage
Test attachment upload and retrieval:
```bash
# Send email with PDF attachment
npm run test:send-email "invoice" --attachment="test-invoice.pdf"

# Validate S3 upload
npm run test:check-s3 --bucket=nailit-dev-emails

# Test attachment download
npm run test:download-attachment --email-id="test-123"
```

## 🧹 Data Management

### Truncate and Reset
Clean up test data for fresh testing:

```bash
# Full reset (PostgreSQL + S3)
npm run test:truncate-all

# PostgreSQL only
npm run test:truncate-db

# S3 only  
npm run test:truncate-s3

# Reset specific test account
npm run test:reset-account nailit.test.homeowner@gmail.com
```

## 🚀 **Quick Start**

### **1. Environment Setup**
```bash
# Copy environment template and fill in your Gmail API credentials
cp .env.email-testing.template .env.local

# Edit .env.local with your actual Gmail API credentials:
# GMAIL_TEST_CLIENT_ID=your-actual-client-id
# GMAIL_TEST_CLIENT_SECRET=your-actual-client-secret
```

### **2. OAuth Setup (One-time)**
```bash
# Set up OAuth for both test accounts
npm run test:email-setup

# Follow the OAuth flow for each account, then run callback commands
npm run test:oauth-callback contractor <auth_code>
npm run test:oauth-callback homeowner <auth_code>
```

### **3. Run Tests**
```bash
# Quick smoke test
npm run test:email-smoke

# Complete testing workflow
npm run test:email-complete
```

## 📖 **Available Commands**

### **OAuth Management**
- `npm run test:oauth-setup <contractor|homeowner>` - Start OAuth flow
- `npm run test:oauth-callback <account> <code>` - Complete OAuth with auth code

### **Email Operations**
- `npm run test:send-email <template>` - Send single test email
- `npm run test:send-bulk-emails <count> <days_back>` - Send historical emails

### **Webhook Testing**
- `npm run test:setup-webhook` - Set up Gmail push notifications
- `npm run test:validate-webhook [timeout]` - Test webhook processing
- `npm run test:stop-webhook` - Stop webhook subscription

### **Data Management**
- `npm run test:truncate-all` - Reset all test data (PostgreSQL + S3)
- `npm run test:query-emails [limit]` - Check database for test emails
- `npm run test:check-s3 [expected_files]` - Validate S3 storage

### **Master Workflows**
- `npm run test:email-complete` - Full testing workflow
- `npm run test:email-smoke` - Quick validation
- `npm run test:email-setup` - Initial OAuth setup

---

**Last Updated**: January 7, 2025  
**Test Accounts**: `nailit.test.homeowner@gmail.com`, `nailit.test.contractor@gmail.com`  
**Status**: ✅ Complete email testing infrastructure ready
