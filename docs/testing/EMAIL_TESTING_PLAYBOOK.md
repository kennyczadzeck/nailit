# 🧪 Email Testing Playbook

## 🏠 HOMEOWNER-ONLY EMAIL TESTING PRINCIPLE

**CRITICAL ARCHITECTURAL DECISION**: All email testing follows the **HOMEOWNER-ONLY** approach:
- Email ingestion ONLY from homeowner Gmail accounts
- NEVER access contractor Gmail accounts for processing
- Complete conversation capture through homeowner's perspective
- Privacy-compliant testing that mirrors production usage

## 🎯 Testing Objectives

This playbook provides step-by-step instructions for testing the nailit email ingestion system using realistic scenarios and data. All testing follows the homeowner-only principle to ensure accurate simulation of production email processing.

### Key Testing Principles
- **Homeowner-Centric**: All email ingestion testing uses homeowner Gmail as the source
- **Realistic Data**: Test with authentic contractor-homeowner conversations
- **Complete Coverage**: Test both historical and real-time email processing
- **Privacy Compliant**: Only access homeowner's own Gmail account

## 🚀 Quick Start (HOMEOWNER-ONLY)

### 1. Setup OAuth Credentials for Homeowner Testing
```bash
# Setup homeowner account for email ingestion (PRIMARY)
npm run test:oauth-setup homeowner

# Setup contractor account for test email generation only (SECONDARY)
npm run test:oauth-setup contractor

# Verify both accounts are properly configured
npm run test:oauth-status
```

**CRITICAL**: Homeowner account is used for ingestion, contractor account only for sending test emails TO homeowner.

### 2. Generate Test Email Conversations
```bash
# Generate realistic bidirectional conversations (contractor↔homeowner)
npm run test:send-conversations 5 30

# All emails will appear in homeowner's Gmail for ingestion testing
```

### 3. Test Historical Email Ingestion (HOMEOWNER-ONLY)
```bash
# Discover emails in homeowner's Gmail
npm run test:historical-discover -- --project=kitchen-reno --months=1

# Import emails FROM homeowner's Gmail into database
npm run test:historical-import -- --project=kitchen-reno --start=2025-06-01 --end=2025-07-01
```

### 4. Validate Homeowner-Only Compliance
```bash
# Run comprehensive homeowner-only validation
npm run test:validate-homeowner-only

# Validate conversation quality
npm run test:validate-conversations
```

## 📋 Detailed Testing Scenarios

### Scenario 1: Mid-Project Onboarding (HOMEOWNER PERSPECTIVE)
**Goal**: Test importing 6 months of existing project emails from homeowner's Gmail

```bash
# 1. Setup test project and homeowner user
npx tsx scripts/setup-test-project.ts

# 2. Generate historical conversations in homeowner's Gmail
npm run test:send-conversations 10 180  # 10 threads over 6 months

# 3. Test discovery from homeowner's Gmail
npm run test:historical-discover -- --project=kitchen-reno --months=6

# 4. Import emails FROM homeowner's Gmail
npm run test:historical-import -- --project=kitchen-reno --start=2025-01-01 --end=2025-07-01

# 5. Validate homeowner-only compliance
npm run test:validate-homeowner-only
```

**Expected Results**:
- All emails ingested from homeowner's Gmail account only
- Complete conversation threads captured
- Proper team member filtering applied
- Database records marked with homeowner source

### Scenario 2: Real-Time Email Processing (HOMEOWNER WEBHOOKS)
**Goal**: Test webhook processing of new emails arriving in homeowner's Gmail

```bash
# 1. Setup Gmail webhooks for homeowner account
# (This requires production webhook setup - see webhook documentation)

# 2. Send test email TO homeowner
npm run test:send-email

# 3. Verify webhook processes email from homeowner's perspective
# Check logs and database for proper homeowner-only processing
```

### Scenario 3: Large Project History (HOMEOWNER BULK PROCESSING)
**Goal**: Test performance with 1000+ emails in homeowner's Gmail

```bash
# 1. Generate large email dataset in homeowner's Gmail
npm run test:send-conversations 50 365  # 50 threads over 1 year

# 2. Test bulk discovery from homeowner's Gmail
npm run test:historical-discover -- --project=large-renovation --months=12

# 3. Process in batches from homeowner's Gmail
npm run test:historical-import -- --project=large-renovation --start=2024-07-01 --end=2025-07-01

# 4. Monitor processing performance and homeowner-only compliance
npm run test:validate-homeowner-only
```

## 🔧 Troubleshooting (HOMEOWNER-ONLY FOCUS)

### Issue: No emails discovered in homeowner's Gmail
**Solution**:
```bash
# 1. Verify homeowner OAuth credentials
npm run test:oauth-status

# 2. Check homeowner Gmail has test emails
npm run test:gmail:cleanup-preview

# 3. Generate test emails TO homeowner
npm run test:send-conversations 3 7

# 4. Retry discovery from homeowner's Gmail
npm run test:historical-discover -- --project=test --months=1
```

### Issue: Emails not being processed from homeowner's Gmail
**Diagnosis**:
```bash
# 1. Check team member filtering for homeowner projects
npm run test:validate-homeowner-only

# 2. Verify homeowner project setup
npx tsx scripts/check-email-db.ts

# 3. Test email processing manually
npm run test:send-email
```

### Issue: Contractor emails being processed directly (VIOLATION)
**CRITICAL FIX**:
```bash
# 1. Run homeowner-only validation to identify violations
npm run test:validate-homeowner-only

# 2. Check for contractor OAuth sessions with ingestion scopes
npm run test:oauth-status

# 3. Remove any contractor-sourced email records
# (This should NEVER happen with proper homeowner-only implementation)
```

## 📊 Validation and Quality Assurance

### Homeowner-Only Compliance Checklist
- [ ] All email ingestion from homeowner Gmail only
- [ ] No contractor Gmail access for processing
- [ ] Database records have homeowner user IDs
- [ ] Provider data includes homeowner source markers
- [ ] Team member filtering from homeowner perspective
- [ ] OAuth sessions properly scoped and separated

### Run Validation Suite
```bash
# Comprehensive homeowner-only validation
npm run test:validate-homeowner-only

# Expected results: 100% compliance with homeowner-only principle
```

### Conversation Quality Validation
```bash
# Validate bidirectional conversation authenticity
npm run test:validate-conversations

# Expected results: 80%+ quality score with authentic conversations
```

## 🧹 Cleanup and Reset

### Clean Test Data (HOMEOWNER-FOCUSED)
```bash
# Remove test emails from homeowner's Gmail
npm run test:gmail:cleanup-all

# Clear database (keeps homeowner user and project)
npm run test:emails:cleanup

# Reset to clean state for new testing
npm run test:validate-homeowner-only
```

### Reset OAuth Credentials
```bash
# Re-setup homeowner credentials for ingestion
npm run test:oauth-setup homeowner

# Re-setup contractor credentials for test email generation
npm run test:oauth-setup contractor

# Verify proper homeowner-only configuration
npm run test:oauth-status
```

## 📚 Advanced Testing

### Custom Email Scenarios (HOMEOWNER PERSPECTIVE)
```bash
# Generate specific conversation types in homeowner's Gmail
npm run test:send-conversations 3 14  # 3 threads over 2 weeks

# Test specific ingestion patterns from homeowner's Gmail
npm run test:historical-import -- --project=custom --start=2025-06-15 --end=2025-06-30
```

### Performance Testing (HOMEOWNER GMAIL)
```bash
# Test large volume processing from homeowner's Gmail
npm run test:send-conversations 100 365  # 100 threads over 1 year
npm run test:historical-import -- --project=performance-test --start=2024-07-01 --end=2025-07-01

# Monitor processing metrics and homeowner-only compliance
npm run test:validate-homeowner-only
```

## 🔐 Security and Privacy (HOMEOWNER-ONLY)

### Privacy Compliance
- ✅ Only accesses homeowner's own Gmail account
- ✅ Never reads contractor private emails
- ✅ Respects Gmail API rate limits and permissions
- ✅ Uses minimal required OAuth scopes for homeowner

### Data Protection
- ✅ All emails associated with homeowner user ID
- ✅ Complete audit trail for homeowner email processing
- ✅ Secure credential storage and separation
- ✅ Regular validation of homeowner-only compliance

## 📋 Testing Checklist

### Pre-Testing Setup
- [ ] Homeowner OAuth configured with ingestion scopes
- [ ] Contractor OAuth configured with send-only scopes
- [ ] Test project and homeowner user created
- [ ] Gmail cleanup completed

### During Testing
- [ ] All emails generated TO homeowner Gmail
- [ ] All ingestion FROM homeowner Gmail only
- [ ] Team member filtering validated
- [ ] Conversation quality maintained

### Post-Testing Validation
- [ ] Homeowner-only compliance verified
- [ ] Database records properly attributed
- [ ] OAuth sessions correctly scoped
- [ ] Documentation updated if needed

---

**Remember**: The homeowner-only principle is fundamental to nailit's architecture. All email testing must respect this principle to ensure accurate simulation of production behavior and maintain privacy compliance.

## 🚨 **CRITICAL PRINCIPLE: Gmail API Only, No Direct Database Writes**

**⚠️ FUNDAMENTAL RULE**: All email generation scripts ONLY send emails via Gmail API. They NEVER write to the database directly.

**✅ CORRECT EMAIL FLOW**:
1. **Email Generation**: Scripts send emails via Gmail API → Emails appear in actual Gmail inboxes
2. **Email Ingestion**: Database populated ONLY through proper ingestion pathways:
   - **Historical Discovery**: Gmail API queries to find existing emails
   - **Real-time Processing**: Webhooks for new incoming emails

**❌ INCORRECT FLOW (NEVER DO THIS)**:
- ~~Scripts writing EmailMessage records directly to database~~
- ~~Bypassing actual Gmail sending~~
- ~~Creating mock data without real Gmail API calls~~

This ensures we test the **actual email ingestion pathways** that will be used in production.

---

## 📧 Test Gmail Accounts

### Primary Test Accounts
- **Homeowner**: `nailit.test.homeowner@gmail.com` (Receives emails)
- **Contractor**: `nailit.test.contractor@gmail.com` (Sends emails)

### Account Purposes
- **Homeowner Account**: Target for email ingestion, webhook testing, timeline validation
- **Contractor Account**: Source for sending mock renovation emails, testing various scenarios

## 🔐 CRITICAL: OAuth Setup Required

**⚠️ IMPORTANT**: The email testing system sends ACTUAL emails via Gmail API, not just database records.

### Step 1: Set Up OAuth Credentials

You need to configure OAuth credentials for both test accounts to enable Gmail API sending:

```bash
# Check current OAuth status
npm run test:oauth-status

# Set up OAuth for contractor account (sends emails)
npm run test:oauth-setup contractor

# Set up OAuth for homeowner account (receives emails, for cleanup)
npm run test:oauth-setup homeowner
```

### Step 2: Verify Email Sending Works

```bash
# Test sending a single email via Gmail API
npm run test:send-email single cost-change

# Verify the email appears in nailit.test.homeowner@gmail.com inbox
# Check Gmail inbox manually or run:
npm run test:gmail:cleanup-preview
```

### Step 3: Automated Gmail Cleanup

```bash
# Preview what emails would be moved to trash
npm run test:gmail:cleanup-preview

# Move all test emails to trash (safe & recoverable)
npm run test:gmail:cleanup-all

# Move only recent test emails to trash (last 7 days)
npm run test:gmail:cleanup-recent 7
```

**✅ Automated Testing Ready**: The cleanup system now uses Gmail's trash method, which:
- Works with current OAuth scope (`gmail.modify`)
- Safely moves emails to trash (recoverable)
- Enables fully automated testing workflows
- No risk of permanent data loss

## 🚀 **Complete Automated Testing Workflow**

### **Full Testing Cycle** (Recommended)
```bash
# 1. Clean slate - move existing test emails to trash
npm run test:gmail:cleanup-all

# 2. Generate comprehensive dataset via Gmail API (NEVER writes to DB)
npm run test:send-email conversation 10 90    # 10 conversation threads over 90 days
npm run test:send-email bulk 25 120          # 25 historical emails over 120 days

# 3. Verify emails in actual Gmail inboxes
npm run test:gmail:cleanup-preview

# 4. Test your email processing/ingestion features (THIS populates the database)
# - Historical email discovery via Gmail API queries
# - Real-time webhook processing
# - Timeline reconstruction from discovered emails

# 5. Clean up after testing
npm run test:gmail:cleanup-all
```

### **Quick Development Testing**
```bash
# 1. Send specific scenarios via Gmail API
npm run test:send-email single urgent-issue
npm run test:send-email homeowner-reply homeowner-urgent-response

# 2. Test your email ingestion features
# (Your Gmail API query/webhook processing code here)

# 3. Clean up recent emails only
npm run test:gmail:cleanup-recent 1
```

## 🔧 Dev Utilities

### OAuth Test Utility
Use the contractor account to programmatically send mock emails:

```bash
# Set up OAuth for contractor account
npm run test:oauth-setup contractor

# Send mock emails to homeowner
npm run test:send-email single urgent-issue

# Send specific email scenario
npm run test:send-email single cost-change
npm run test:send-email single schedule-delay 
npm run test:send-email single material-substitute
```

### **Email Sending Commands (Updated)**

#### **Single Email Testing**
```bash
# Send contractor emails
npm run test:send-email single cost-change
npm run test:send-email single schedule-delay
npm run test:send-email single urgent-issue
npm run test:send-email single invoice
npm run test:send-email single material-substitute

# Send homeowner replies
npm run test:send-email homeowner-reply homeowner-cost-approval
npm run test:send-email homeowner-reply homeowner-schedule-concern
npm run test:send-email homeowner-reply homeowner-urgent-response
npm run test:send-email homeowner-reply homeowner-invoice-question
npm run test:send-email homeowner-reply homeowner-progress-check
```

#### **Conversation Thread Testing** (Gmail API Only)
```bash
# Generate realistic conversation threads (contractor email + homeowner reply)
npm run test:send-email conversation 5 30     # 5 threads over 30 days
npm run test:send-email conversation 15 90    # 15 threads over 90 days

# Creates realistic email exchanges via Gmail API:
# - Contractor sends initial email via Gmail API
# - Homeowner replies within 48 hours via Gmail API
# - 25% chance of additional homeowner check-ins via Gmail API
# - Proper email threading and dates
# - NEVER writes to database directly
```

#### **Historical Bulk Testing** (Gmail API Only)
```bash
# Generate historical email dataset via Gmail API
npm run test:send-email bulk 50 120          # 50 emails over 120 days
npm run test:send-email bulk 100 365         # 100 emails over 1 year

# Creates realistic historical patterns via Gmail API:
# - Random email types and dates
# - Distributed over specified time period
# - Mix of contractor and homeowner emails
# - NEVER writes to database directly
```

#### **Realistic Conversation Generator** (Gmail API Only)
```bash
# Generate comprehensive realistic conversations via Gmail API
npm run test:emails:realistic generate

# Features:
# - 5 complete conversation threads (quotes, issues, updates, completion, permits)
# - Proper email threading and realistic timing
# - Sends ONLY via Gmail API, NEVER writes to database
# - Database populated through your ingestion pathways
```

### Gmail Inbox Management (Automated)

```bash
# Preview emails in Gmail inboxes
npm run test:gmail:cleanup-preview

# Move all test emails to trash (automated testing)
npm run test:gmail:cleanup-all

# Move emails from specific account to trash
npx tsx scripts/email-testing/gmail-inbox-cleaner.ts trash-homeowner
npx tsx scripts/email-testing/gmail-inbox-cleaner.ts trash-contractor

# Move emails by subject to trash
npx tsx scripts/email-testing/gmail-inbox-cleaner.ts trash-subject "Kitchen Renovation"
```

**🔄 Automated Testing Benefits**:
- ✅ **Safe Cleanup**: Uses trash method (recoverable)
- ✅ **Current OAuth Scope**: Works with `gmail.modify` 
- ✅ **Batch Processing**: Handles large volumes efficiently
- ✅ **Rate Limiting**: Respects Gmail API limits
- ✅ **CI/CD Ready**: Fully automated testing workflows
- ✅ **Gmail API Only**: No direct database manipulation

## 📥 **Email Types & Templates**

### **Contractor Email Templates**
- **`cost-change`**: Kitchen renovation cost updates with detailed breakdown
- **`schedule-delay`**: Timeline changes due to material delays or issues
- **`urgent-issue`**: Emergency situations (water leaks, safety concerns)
- **`invoice`**: Payment requests with work completion details
- **`material-substitute`**: Product substitution proposals with alternatives

### **Homeowner Reply Templates** (NEW)
- **`homeowner-cost-approval`**: Approval of cost changes with questions
- **`homeowner-schedule-concern`**: Concerns about timeline delays
- **`homeowner-urgent-response`**: Quick responses to urgent issues
- **`homeowner-invoice-question`**: Questions about billing details
- **`homeowner-material-questions`**: Questions about material substitutions
- **`homeowner-progress-check`**: Proactive project status check-ins

### **Realistic Email Patterns**
The conversation generator creates realistic patterns via Gmail API:
- **Initial Contact**: Contractor sends project update/issue
- **Response Time**: Homeowner replies within 24-48 hours
- **Follow-ups**: 25% chance of additional homeowner-initiated check-ins
- **Threading**: Proper email thread relationships
- **Timing**: Realistic date distribution over specified periods
- **Database Population**: ONLY through your ingestion pathways, not direct writes

## 📥 Ingestion Testing

### Two Critical Testing Modes

#### 1. Historical Bulk Ingestion (CRITICAL FOR EXISTING PROJECTS)
Test processing existing emails from Gmail API in bulk:
```bash
# FIRST: Clear existing data (database only - emails stay in Gmail)
npm run test:emails:cleanup

# SECOND: Generate comprehensive historical dataset via Gmail API (NOT database)
npm run test:send-email conversation 20 180   # 20 conversation threads over 6 months
npm run test:send-email bulk 50 365          # 50 additional emails over 1 year

# THIRD: Test historical discovery via Gmail API queries (THIS populates database)
npm run test:discover-historical --date-range="6-months" --project-id="test-123"

# FOURTH: Run historical ingestion with progress tracking
npm run test:ingest-historical --batch-size=50 --rate-limit=100

# FIFTH: Validate bulk processing results
npm run test:validate-ingestion --mode=historical --expected-count=480
```

#### 2. Real-time Webhook Ingestion  
Test live email processing via webhooks:
```bash
# Set up webhook subscription for homeowner account
npm run test:setup-webhook

# Send test email from contractor via Gmail API (NOT database)
npm run test:send-email single urgent-issue

# Validate webhook processing (within 30 seconds)
npm run test:validate-webhook --timeout=30

# Check database for new EmailMessage record (populated via webhook)
npm run test:check-db --latest
```

## 🕐 **Historical Email Testing Scenarios**

### Scenario 1: "Mid-Project Onboarding"
Simulates homeowner joining NailIt after project has been running for months:

```bash
# Generate realistic historical email dataset via Gmail API (NOT database)
npm run test:send-email conversation 15 120   # 15 conversation threads over 4 months
npm run test:send-email bulk 30 120          # 30 additional emails over 4 months

# Test historical import workflow (THIS populates database via ingestion)
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
# Generate large historical dataset (100+ emails) via Gmail API (NOT database)
npm run test:send-email conversation 25 365   # 25 conversation threads over 1 year
npm run test:send-email bulk 75 365          # 75 additional emails over 1 year

# Test batch processing performance (THIS populates database via ingestion)
npm run test:historical-batch-processing \
  --batch-size=100 \
  --concurrent-jobs=3 \
  --timeout="2-hours"

# Monitor resource usage during bulk processing
npm run test:monitor-bulk-processing \
  --metrics="cpu,memory,database-connections,api-quotas"
```

### **Scenario 3: "Conversation Thread Testing"** (Gmail API Only)
Tests email threading and conversation reconstruction:

```bash
# Generate realistic conversation patterns via Gmail API (NOT database)
npm run test:send-email conversation 10 60    # 10 threads over 2 months

# Test conversation grouping and threading (THIS populates database via ingestion)
npm run test:validate-conversations \
  --expected-threads=10 \
  --expected-messages=25 \
  --thread-integrity=true
```

## 🚨 **TROUBLESHOOTING**

### Problem: "No emails visible in Gmail inbox"

**Root Cause**: OAuth credentials not set up or emails not actually sent via Gmail API

**Solution**:
1. Check OAuth setup: `npm run test:oauth-status`
2. Set up OAuth: `npm run test:oauth-setup contractor`
3. Test sending: `npm run test:send-email single urgent-issue`
4. Manually check `nailit.test.homeowner@gmail.com` inbox
5. Use Gmail cleanup preview: `npm run test:gmail:cleanup-preview`

### Problem: "Emails still in Gmail after cleanup"

**Root Cause**: Database cleanup ≠ Gmail inbox cleanup

**Solution**:
```bash
# This only clears database records:
npm run test:emails:cleanup

# This moves actual Gmail emails to trash (automated testing):
npm run test:gmail:cleanup-all

# Check Gmail trash folder to recover emails if needed
```

**✅ Fixed**: Gmail cleanup now uses safe trash method for automated testing

### Problem: "invalid_grant" OAuth errors

**Root Cause**: OAuth tokens expired or invalid

**Solution**:
1. Re-run OAuth setup: `npm run test:oauth-setup contractor`
2. Follow the browser authorization flow
3. Update credentials files in `scripts/email-testing/credentials/`

### **Problem: "Conversation threads not linking properly"**

**Root Cause**: Email threading issues or timing problems

**Solution**:
```bash
# Check email headers and threading
npm run test:validate-email-headers

# Verify conversation thread integrity
npm run test:validate-conversations --debug=true
```

### **Problem: "Database has no emails after generation"** (EXPECTED BEHAVIOR)

**Root Cause**: Email generators only send via Gmail API, don't write to database

**Solution**: This is correct! Database should be empty until you run ingestion:
```bash
# Generate emails via Gmail API (database stays empty)
npm run test:send-email conversation 5 30

# Populate database through proper ingestion pathways
npm run test:discover-historical
npm run test:ingest-historical

# Now check database
npm run test:query-emails
```

## 📊 **Performance Testing for Historical Import**

### Gmail API Rate Limiting Tests
```bash
# Test compliance with Gmail API quotas
npm run test:gmail-rate-limits --duration="1-hour"

# Monitor API usage during bulk operations
npm run test:monitor-gmail-api --operations="send,read,delete"
```

### Database Performance Tests
```bash
# Test bulk email insertion performance (via ingestion, not direct writes)
npm run test:db-bulk-insert --emails=1000

# Test timeline query performance with large datasets
npm run test:timeline-performance --emails=5000
```

### **Conversation Processing Tests**
```bash
# Test conversation thread processing performance
npm run test:conversation-performance --threads=50 --messages-per-thread=5

# Test email threading algorithm performance
npm run test:threading-performance --emails=1000
```

## 🎯 **Success Criteria**

### Email Sending Verification
- [ ] Emails appear in actual Gmail inbox (`nailit.test.homeowner@gmail.com`)
- [ ] Email content matches templates
- [ ] Conversation threads maintain proper threading
- [ ] Rate limiting respected (no API quota exceeded)
- [ ] **NEW**: Homeowner replies appear in contractor inbox
- [ ] **NEW**: Conversation threads show proper email relationships
- [ ] **CRITICAL**: Database remains empty until ingestion runs

### Email Cleanup Verification
- [ ] Gmail inboxes empty after cleanup
- [ ] Database records cleared (if any exist from ingestion)
- [ ] S3 attachments removed
- [ ] No orphaned data
- [ ] **NEW**: Emails recoverable from Gmail trash

### Historical Ingestion Verification
- [ ] Emails discovered via Gmail API search (not direct database access)
- [ ] Batch processing completes without errors
- [ ] Timeline reconstruction accurate
- [ ] Performance within acceptable limits
- [ ] **NEW**: Conversation threads properly grouped
- [ ] **NEW**: Email relationships preserved
- [ ] **CRITICAL**: Database populated ONLY through ingestion pathways

### **Conversation Thread Verification**
- [ ] Email threads maintain proper relationships
- [ ] Contractor-to-homeowner emails thread correctly
- [ ] Homeowner replies link to original emails
- [ ] Thread dates follow realistic patterns
- [ ] Subject line threading works properly
- [ ] **CRITICAL**: All emails sent via Gmail API, not database writes

## 📝 **Notes**

- **Always use Gmail API**: The system sends real emails, not mock data
- **OAuth is required**: Both test accounts need valid OAuth credentials
- **Two-step cleanup**: Database cleanup + Gmail inbox cleanup
- **Rate limiting**: Respect Gmail API quotas during bulk operations
- **Manual verification**: Check actual Gmail inboxes to confirm email delivery
- **NEW**: Conversation threads create realistic email patterns
- **NEW**: Trash method enables safe automated testing
- **NEW**: Bulk generation supports historical testing scenarios
- **CRITICAL**: Email generators NEVER write to database directly
- **CRITICAL**: Database populated ONLY through ingestion pathways (Gmail queries + webhooks)

## 🗄️ Data Storage Testing

### PostgreSQL Email Storage
Test email metadata and content storage via ingestion:
```bash
# Generate emails via Gmail API (database stays empty)
npm run test:send-email conversation 5 30

# Populate database through ingestion
npm run test:discover-historical
npm run test:ingest-historical

# Check EmailMessage table (now populated via ingestion)
npm run test:query-emails

# Validate email content storage
npm run test:validate-content

# Test search functionality
npm run test:search-emails --query="cost increase"

# Test conversation thread storage
npm run test:validate-conversations --check-database=true
```

### S3 Attachment Storage
Test attachment upload and retrieval:
```bash
# Send email with PDF attachment via Gmail API
npm run test:send-email single invoice  # Invoice template includes attachments

# Run ingestion to process attachments
npm run test:ingest-historical

# Validate S3 upload (populated via ingestion)
npm run test:check-s3 --bucket=nailit-dev-emails

# Test attachment download
npm run test:download-attachment --email-id="test-123"
```

## 🧹 Data Management

### Truncate and Reset
Clean up test data for fresh testing:

```bash
# Full reset (PostgreSQL + S3 + Gmail trash)
npm run test:truncate-all
npm run test:gmail:cleanup-all

# PostgreSQL only (clears ingested data)
npm run test:truncate-db

# S3 only  
npm run test:truncate-s3

# Gmail only (move to trash)
npm run test:gmail:cleanup-all

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

### **3. Generate Test Data** (Gmail API Only)
```bash
# Generate comprehensive test dataset via Gmail API (NOT database)
npm run test:send-email conversation 10 90    # 10 conversation threads
npm run test:send-email bulk 25 120          # 25 historical emails

# Verify emails are in Gmail (database should be empty at this point)
npm run test:gmail:cleanup-preview
```

### **4. Test Email Ingestion** (THIS Populates Database)
```bash
# Run your email ingestion/discovery code
npm run test:discover-historical
npm run test:ingest-historical

# Verify database is now populated via ingestion
npm run test:query-emails
```

### **5. Clean Up**
```bash
# Move all test emails to trash (safe & recoverable)
npm run test:gmail:cleanup-all

# Clear database records (if any from ingestion)
npm run test:truncate-db
```

## 📖 **Available Commands**

### **OAuth Management**
- `npm run test:oauth-setup <contractor|homeowner>` - Start OAuth flow
- `npm run test:oauth-callback <account> <code>` - Complete OAuth with auth code

### **Email Operations** (Gmail API Only)
- `npm run test:send-email single <template>` - Send single test email via Gmail API
- `npm run test:send-email homeowner-reply <template>` - Send homeowner reply via Gmail API
- `npm run test:send-email conversation <count> <days>` - Generate conversation threads via Gmail API
- `npm run test:send-email bulk <count> <days>` - Send historical emails via Gmail API
- `npm run test:emails:realistic generate` - Generate comprehensive conversations via Gmail API

### **Gmail Management** (Updated)
- `npm run test:gmail:cleanup-preview` - Preview emails that would be moved to trash
- `npm run test:gmail:cleanup-all` - Move all test emails to trash
- `npm run test:gmail:cleanup-recent <days>` - Move recent emails to trash

### **Webhook Testing**
- `npm run test:setup-webhook` - Set up Gmail push notifications
- `npm run test:validate-webhook [timeout]` - Test webhook processing
- `npm run test:stop-webhook` - Stop webhook subscription

### **Data Management**
- `npm run test:truncate-all` - Reset all test data (PostgreSQL + S3)
- `npm run test:query-emails [limit]` - Check database for test emails (populated via ingestion)
- `npm run test:check-s3 [expected_files]` - Validate S3 storage

### **Master Workflows**
- `npm run test:email-complete` - Full testing workflow
- `npm run test:email-smoke` - Quick validation
- `npm run test:email-setup` - Initial OAuth setup

---

## 🎉 **Current Test Dataset**

**✅ Active Test Data** (Generated via Gmail API ONLY):
- **25 emails** in contractor account
- **24 emails** in homeowner account  
- **5 conversation threads** with realistic timing
- **10 historical emails** distributed over 60 days
- **Mix of email types**: Cost changes, schedule updates, urgent issues, invoices, material substitutions
- **Bidirectional communication**: Contractor emails + homeowner replies
- **Realistic patterns**: Proper threading, timing, and content
- **Database Status**: Empty until ingestion runs (CORRECT BEHAVIOR)

**📊 Email Distribution**:
- Urgent issues with quick responses
- Cost change discussions with approvals
- Schedule delays with concerns
- Invoice questions and clarifications
- Material substitution discussions
- Proactive homeowner check-ins

**🔄 Automated Testing Ready**: Full cleanup and regeneration capabilities with Gmail API only

---

**Last Updated**: January 7, 2025  
**Test Accounts**: `nailit.test.homeowner@gmail.com`, `nailit.test.contractor@gmail.com`  
**Status**: ✅ Complete email testing infrastructure with Gmail API only (no direct database writes)

## Enhanced Conversation Validation

### Bidirectional Communication Requirements

**CRITICAL REQUIREMENT**: All test data must contain authentic bidirectional conversations between contractor and homeowner with:

- ✅ **Proper email threading** (Re: subjects)
- ✅ **Realistic response timing** (2-48 hours between messages)
- ✅ **Authentic content patterns** (contractor sends project updates, homeowner responds with questions/approvals)
- ✅ **Bidirectional flow** (contractor → homeowner → contractor)
- ✅ **Thread continuity** (conversations that make sense together)

### Conversation Quality Standards

Each conversation thread must include:

1. **Contractor Initiation**: Project updates, cost changes, schedule updates, urgent issues
2. **Homeowner Response**: Questions, approvals, concerns, requests for clarification
3. **Optional Follow-up**: Contractor confirmation, additional details, status updates

### Validation Tools

```bash
# Validate existing conversations
npm run test:validate-conversations

# Generate enhanced conversation threads
npm run test:send-email conversation 5 30  # 5 threads over 30 days
```

## Quick Start Guide

### 1. OAuth Setup (Required)

```bash
# Set up OAuth for both accounts
npm run test:oauth-setup contractor
npm run test:oauth-setup homeowner

# Check OAuth status
npm run test:oauth-status
```

### 2. Generate Authentic Test Data

```bash
# Generate bidirectional conversation threads
npm run test:send-email conversation 10 60  # 10 conversations over 60 days

# Validate conversation quality
npm run test:validate-conversations
```

### 3. Verify Email Delivery

```bash
# Preview current emails
npm run test:gmail:cleanup-preview

# Clean up test emails (moves to trash)
npm run test:gmail:cleanup-all
```

## Available Commands

### OAuth Management
```bash
npm run test:oauth-setup <contractor|homeowner>    # Setup OAuth
npm run test:oauth-callback <contractor|homeowner> # Handle callback
npm run test:oauth-status                          # Check status
```

### Email Generation (Gmail API Only)
```bash
npm run test:send-email single <template>          # Single email
npm run test:send-email bulk <count> <days>        # Bulk emails
npm run test:send-email conversation <count> <days> # Conversation threads
npm run test:send-email homeowner-reply <template> # Homeowner response
```

### Conversation Validation
```bash
npm run test:validate-conversations               # Validate existing conversations
```

### Email Management
```bash
npm run test:gmail:cleanup-preview                # Preview emails to clean
npm run test:gmail:cleanup-all                    # Move all test emails to trash
npm run test:gmail:cleanup-recent                 # Move recent emails to trash
```

### Data Management
```bash
npm run test:emails:data status                   # Check database status
npm run test:emails:cleanup                       # Clean database only
```

## Email Templates

### Contractor Templates
- `cost-change` - Cost update notifications
- `schedule-delay` - Schedule change notifications  
- `material-substitute` - Material substitution requests
- `urgent-issue` - Urgent problem notifications
- `invoice` - Invoice and payment requests

### Homeowner Response Templates
- `homeowner-cost-approval` - Cost change responses
- `homeowner-schedule-concern` - Schedule concern responses
- `homeowner-material-questions` - Material selection questions
- `homeowner-urgent-response` - Urgent issue responses
- `homeowner-invoice-question` - Invoice questions
- `homeowner-progress-check` - Progress check-ins

## Enhanced Conversation Patterns

### Pattern 1: Cost Change Discussion
```
1. Contractor: "Kitchen Renovation - Cost Update Required"
2. Homeowner: "Re: Kitchen Renovation - Cost Update Required"
3. Contractor: "Re: Kitchen Renovation - Cost Update Required - Timeline Confirmed"
```

### Pattern 2: Urgent Issue Resolution
```
1. Contractor: "URGENT: Kitchen Water Leak"
2. Homeowner: "Re: URGENT: Kitchen Water Leak" (within 2-4 hours)
3. Contractor: "Re: URGENT: Kitchen Water Leak - Issue Resolved"
```

### Pattern 3: Material Selection Process
```
1. Contractor: "Flooring Material Substitution"
2. Homeowner: "Re: Flooring Material Substitution" (questions)
3. Contractor: "Re: Flooring Material Substitution - Samples Available"
4. Homeowner: "Re: Flooring Material Substitution - Approved!"
```

## Troubleshooting

### OAuth Issues
```bash
# Check OAuth status
npm run test:oauth-status

# Re-authenticate if expired
npm run test:oauth-setup contractor
npm run test:oauth-setup homeowner
```

### Email Delivery Issues
- Verify OAuth credentials are valid
- Check Gmail API quotas
- Ensure proper email formatting
- Verify recipient email addresses

### Conversation Quality Issues
- Run conversation validator to identify problems
- Ensure proper "Re:" threading
- Check for bidirectional communication
- Verify realistic timing between messages

## System Architecture

### Gmail API Integration
- **Authentication**: OAuth 2.0 with refresh tokens
- **Sending**: `gmail.users.messages.send()` with base64 encoded messages
- **Reading**: `gmail.users.messages.list()` and `gmail.users.messages.get()`
- **Cleanup**: `gmail.users.messages.trash()` for safe removal

### Database Separation
- **Email Generation**: ONLY via Gmail API
- **Database Population**: ONLY via ingestion pathways
- **Testing**: Validates actual production ingestion code

### Conversation Threading
- **Subject Lines**: Use "Re:" prefix for replies
- **Message IDs**: Gmail handles threading automatically
- **Timing**: Realistic delays between messages (2-48 hours)

## Best Practices

1. **Always validate conversations** after generating test data
2. **Use realistic timing** between contractor and homeowner messages
3. **Include authentic content** that matches real project communication
4. **Test bidirectional flow** in every conversation thread
5. **Clean up test data** regularly to avoid quota issues
6. **Monitor OAuth status** and refresh tokens as needed

## Conversation Quality Metrics

The conversation validator checks:
- **Bidirectional Communication**: Both contractor and homeowner participate
- **Proper Threading**: Reply emails use "Re:" subjects  
- **Realistic Timing**: Responses within 2-48 hours
- **Authentic Content**: Contractor/homeowner language patterns
- **Thread Continuity**: Conversations make logical sense

Target: 80%+ quality score with all 5 checks passing.
