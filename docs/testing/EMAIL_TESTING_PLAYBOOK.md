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

### Two Testing Modes

#### 1. Historical Bulk Ingestion
Test processing existing emails in bulk:
```bash
# Clear test data
npm run test:truncate-data

# Generate historical emails 
npm run test:generate-bulk-emails --count=100 --days-back=60

# Run historical ingestion
npm run test:ingest-historical

# Validate results
npm run test:validate-ingestion --mode=historical
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
