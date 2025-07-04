# Email Ingestion Testing Strategy

## 🎯 **Testing Philosophy**

Our email ingestion testing strategy addresses both key use cases:
1. **Historical Email Ingestion**: Bulk import of existing project emails
2. **Real-time Email Ingestion**: Live monitoring and processing of new emails

We use a **multi-layered approach** that progresses from isolated unit tests to real-world integration testing.

---

## 🧪 **Testing Layers**

### **Layer 1: Unit Tests with Mock Data**
**Purpose**: Fast, reliable tests for core logic without external dependencies

**Implementation**:
- ✅ `tests/fixtures/email-fixtures.ts` - Comprehensive test data
- ✅ `tests/bdd/features/email-ingestion.test.tsx` - BDD scenarios  
- ✅ Mock Gmail API responses and webhook payloads

**Test Data Coverage**:
```typescript
// Historical emails (Use Case 1)
- 3 high-relevance project emails (quotes, permits, deliveries)
- 1 medium-relevance email (schedule updates)  
- 1 edge-case email (personal note from team member) for boundary testing

// Real-time emails (Use Case 2)
- Urgent inspection notifications
- Change orders with cost impacts
- Invalid/malformed emails for error handling

// Filtering Strategy
- Team member whitelist filtering (only emails FROM known team members processed)
- No content-based filtering needed since source filtering handles relevance
```

**Key Scenarios**:
- ✅ Bulk import of 50+ historical emails
- ✅ Real-time processing within 30-second SLA
- ✅ Attachment handling and S3 storage
- ✅ AI classification accuracy validation
- ✅ Error handling and retry logic

---

### **Layer 2: Staging Environment with Test Gmail Account**

#### **Test Gmail Account Setup**
```
Primary Test Account: nailit.email.testing@gmail.com
Purpose: Controlled environment for email ingestion testing

Team Member Accounts (for sending test emails):
- contractor.test@gmail.com
- architect.test@gmail.com  
- inspector.test@citycode.gov
- supplier.test@materials.com
```

#### **Environment Configuration**
```bash
# Staging environment variables
GMAIL_TEST_CLIENT_ID=your_test_client_id
GMAIL_TEST_CLIENT_SECRET=your_test_client_secret  
GMAIL_TEST_REFRESH_TOKEN=your_test_refresh_token
NAILIT_ENVIRONMENT=staging
```

#### **Automated Test Scenarios**

**Use Case 1: Historical Email Import**
```typescript
// Test script: tests/integration/email-historical-import.test.ts
describe('Historical Email Import - Staging', () => {
  test('should import and process 25 pre-seeded emails', async () => {
    // 1. Connect test Gmail account via OAuth
    // 2. Trigger historical import API endpoint
    // 3. Monitor processing status via API
    // 4. Validate all emails processed within 2 minutes
    // 5. Verify AI classification accuracy >85%
    // 6. Check attachment storage in S3
  });
});
```

**Use Case 2: Real-time Email Processing** 
```typescript
// Test script: tests/integration/email-realtime.test.ts
describe('Real-time Email Processing - Staging', () => {
  test('should process new email within 30 seconds', async () => {
    // 1. Set up webhook monitoring
    // 2. Send test email from contractor.test@gmail.com
    // 3. Verify webhook received within 5 seconds
    // 4. Check email processed and classified within 30 seconds
    // 5. Validate flagged items created for cost changes
  });
});
```

---

### **Layer 3: Production Monitoring & Validation**

#### **Production Health Checks**
```typescript
// Continuous monitoring endpoints
GET /api/email/health - Email system health
GET /api/email/metrics - Processing metrics
GET /api/email/test-webhook - Webhook validation
```

#### **Real User Monitoring**
- Processing time alerts (>30 seconds)
- Classification accuracy monitoring
- Error rate thresholds (<5%)
- S3 storage monitoring

---

## 🔄 **Testing Workflows**

### **Development Workflow**
```bash
# 1. Run unit tests during development
npm run test:email

# 2. Run BDD tests for feature validation  
npm run test:bdd -- features/email-ingestion.feature

# 3. Run integration tests against staging
npm run test:integration:email

# 4. Performance testing with load simulation
npm run test:performance:email
```

### **CI/CD Pipeline Integration**
```yaml
# .github/workflows/email-testing.yml
name: Email Ingestion Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - name: Run Email Unit Tests
        run: npm run test:email
      
  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    if: github.ref == 'refs/heads/develop'
    steps:
      - name: Run Email Integration Tests
        run: npm run test:integration:email
        env:
          GMAIL_TEST_CLIENT_ID: ${{ secrets.GMAIL_TEST_CLIENT_ID }}
          GMAIL_TEST_CLIENT_SECRET: ${{ secrets.GMAIL_TEST_CLIENT_SECRET }}
          GMAIL_TEST_REFRESH_TOKEN: ${{ secrets.GMAIL_TEST_REFRESH_TOKEN }}
```

## 📊 **Test Data Management & Team Member Filtering**

### **Team Member Whitelist Approach**
Our filtering strategy is based on **known team member email addresses** rather than content analysis:

```typescript
// Project team members (defined per project)
teamMembers: [
  'contractor.test@gmail.com',     // General contractor
  'architect.test@gmail.com',      // Project architect  
  'inspector.test@citycode.gov',   // City inspector
  'supplier.test@materials.com'    // Material supplier
]

// Filtering logic: Only process emails FROM these addresses
// This eliminates 99% of irrelevant emails (marketing, spam, personal)
```

### **Historical Email Test Set**
Pre-created emails in test Gmail account for consistent testing:

```
1. Kitchen renovation quote ($45,000) - contractor.test@gmail.com
2. Building permit approval - permits@citycode.gov  
3. Material delivery schedule - supplier.test@materials.com
4. Weather delay notification - contractor.test@gmail.com
5. Personal thank you note - contractor.test@gmail.com (edge case)
```

### **Real-time Test Scenarios**
Automated scripts to send test emails from team members:

```typescript
// scripts/send-test-emails.ts
export const sendTestEmails = {
  urgentInspection: () => sendEmail({
    from: 'inspector.test@citycode.gov',
    to: 'nailit.email.testing@gmail.com',
    subject: 'URGENT: Electrical inspection tomorrow 9 AM',
    body: 'Inspector will arrive tomorrow at 9:00 AM...'
  }),
  
  changeOrder: () => sendEmail({
    from: 'contractor.test@gmail.com', 
    to: 'nailit.email.testing@gmail.com',
    subject: 'Change order required - additional work',
    body: 'Additional cost: $2,800 for electrical upgrade...'
  }),

  // Non-team member email (should be filtered out)
  marketingEmail: () => sendEmail({
    from: 'marketing@homedepot.com',
    to: 'nailit.email.testing@gmail.com',
    subject: 'Black Friday Sale!',
    // This email should never be processed or stored
  })
};
```

---

## 🔧 **Gmail API OAuth Setup for Automated Email Sending**

### ⚠️ **Important: Email Testing Utility Credentials**

This section covers OAuth setup for the **Email Testing Utility** only. These credentials are completely separate from your main application's OAuth credentials.

**Email Testing Utility** (This Section):
- **Purpose**: Automated email sending from contractor test account
- **Usage**: Development and testing only
- **OAuth Client**: Desktop application type
- **Scopes**: `gmail.send` only
- **Storage**: Local `.env.local` and GitHub Secrets

**Production NailIt Application** (Separate):
- **Purpose**: User authentication in deployed app
- **OAuth Client**: Web application type
- **Scopes**: `openid`, `email`, `profile`, `gmail.readonly`, `gmail.modify`
- **Storage**: AWS Secrets Manager (managed by infrastructure)

**📖 For detailed credential management, see:** [`docs/testing/GMAIL_CREDENTIALS_MANAGEMENT.md`](./GMAIL_CREDENTIALS_MANAGEMENT.md)

---

To enable fully automated email testing, we use the Gmail API with OAuth 2.0 to programmatically send emails from the contractor test account (`nailit.test.contractor@gmail.com`) to the homeowner account (`nailit.test.homeowner@gmail.com`).

### **OAuth Configuration Requirements**

#### **1. Google Cloud Project Setup**
Create a separate OAuth configuration in your existing Google Cloud project:

```
Project: Your existing NailIt project
OAuth Client Type: Desktop Application
Scopes Required:
- https://www.googleapis.com/auth/gmail.send
- https://www.googleapis.com/auth/gmail.compose (optional, for drafts)
```

#### **2. OAuth Client Configuration**
```json
{
  "installed": {
    "client_id": "YOUR_CONTRACTOR_CLIENT_ID",
    "project_id": "your-project-id", 
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "client_secret": "YOUR_CONTRACTOR_CLIENT_SECRET",
    "redirect_uris": ["http://localhost"]
  }
}
```

#### **3. Environment Variables (Testing Utility Only)**
Add to your `.env.local` (these are NOT production app credentials):
```bash
# ============================================
# EMAIL TESTING UTILITY CREDENTIALS ONLY
# (NOT for production application)
# ============================================

# Gmail API for automated email testing (contractor account)
GMAIL_CONTRACTOR_CLIENT_ID="your_contractor_client_id"
GMAIL_CONTRACTOR_CLIENT_SECRET="your_contractor_client_secret" 
GMAIL_CONTRACTOR_REFRESH_TOKEN="your_contractor_refresh_token"
GMAIL_CONTRACTOR_EMAIL="nailit.test.contractor@gmail.com"

# ============================================
# PRODUCTION APPLICATION CREDENTIALS
# (Managed separately in AWS Secrets Manager)
# ============================================
# These are handled by infrastructure and should NOT be in .env.local:
# - GOOGLE_CLIENT_ID (for app authentication)
# - GOOGLE_CLIENT_SECRET (for app authentication)
# - Database connection strings
# - Other production secrets
```

### **Implementation Components**

#### **1. OAuth Authorization Script**
```typescript
// scripts/gmail-oauth-setup.ts
import { google } from 'googleapis';

const CLIENT_ID = process.env.GMAIL_CONTRACTOR_CLIENT_ID;
const CLIENT_SECRET = process.env.GMAIL_CONTRACTOR_CLIENT_SECRET;
const REDIRECT_URI = 'http://localhost';

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

// Generate authorization URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: SCOPES
});

console.log('Authorize contractor account by visiting:', authUrl);
// Paste authorization code to get refresh token
```

#### **2. Email Sending Utility**
```typescript
// tests/integration/gmail-sender.ts
import { google } from 'googleapis';
import nodemailer from 'nodemailer';

export class GmailTestSender {
  private oauth2Client: any;
  
  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CONTRACTOR_CLIENT_ID,
      process.env.GMAIL_CONTRACTOR_CLIENT_SECRET,
      'http://localhost'
    );
    
    this.oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_CONTRACTOR_REFRESH_TOKEN
    });
  }

  async sendConstructionEmail(emailType: string, customContent?: any) {
    const accessToken = await this.oauth2Client.getAccessToken();
    
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.GMAIL_CONTRACTOR_EMAIL,
        clientId: process.env.GMAIL_CONTRACTOR_CLIENT_ID,
        clientSecret: process.env.GMAIL_CONTRACTOR_CLIENT_SECRET,
        refreshToken: process.env.GMAIL_CONTRACTOR_REFRESH_TOKEN,
        accessToken: accessToken.token,
      },
    });

    const emailTemplates = {
      quote: {
        subject: 'Kitchen Renovation Quote - Final Version',
        html: this.getQuoteEmailTemplate(customContent),
      },
      permit: {
        subject: 'Building Permit Update - Action Required',
        html: this.getPermitEmailTemplate(customContent),
      },
      inspection: {
        subject: 'URGENT: Inspection Scheduled for Tomorrow',
        html: this.getInspectionEmailTemplate(customContent),
      },
      delivery: {
        subject: 'Material Delivery Confirmation',
        html: this.getDeliveryEmailTemplate(customContent),
      }
    };

    const template = emailTemplates[emailType];
    if (!template) throw new Error(`Unknown email type: ${emailType}`);

    const mailOptions = {
      from: `Mike Johnson - GC Pro <${process.env.GMAIL_CONTRACTOR_EMAIL}>`,
      to: 'nailit.test.homeowner@gmail.com',
      subject: template.subject,
      html: template.html,
      // Add realistic headers
      headers: {
        'X-Mailer': 'Contractor Management System v2.1',
        'X-Priority': emailType === 'inspection' ? '1' : '3'
      }
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Sent ${emailType} email:`, result.messageId);
    return result;
  }

  private getQuoteEmailTemplate(content?: any) {
    return `
      <h2>Kitchen Renovation Quote</h2>
      <p>Hi Sarah,</p>
      <p>Please find the final quote for your kitchen renovation project:</p>
      
      <table border="1" style="border-collapse: collapse;">
        <tr><td><strong>Total Cost:</strong></td><td>$${content?.cost || '45,000'}</td></tr>
        <tr><td><strong>Timeline:</strong></td><td>${content?.timeline || '6-8 weeks'}</td></tr>
        <tr><td><strong>Start Date:</strong></td><td>${content?.startDate || 'December 1st'}</td></tr>
      </table>
      
      <p>This quote includes all materials and labor. Please let me know if you have any questions.</p>
      
      <p>Best regards,<br>
      Mike Johnson<br>
      General Contractor Pro<br>
      (555) 123-4567</p>
    `;
  }

  private getInspectionEmailTemplate(content?: any) {
    return `
      <h2 style="color: red;">URGENT: Inspection Scheduled</h2>
      <p>Hi Sarah,</p>
      <p><strong>Important:</strong> The city inspector will be coming tomorrow at ${content?.time || '10:00 AM'} for the electrical inspection.</p>
      
      <p><strong>Requirements:</strong></p>
      <ul>
        <li>All electrical work must be complete</li>
        <li>Work area must be clean and accessible</li>
        <li>Someone must be present during inspection</li>
      </ul>
      
      <p>Please confirm you'll be available.</p>
      
      <p>Mike Johnson<br>
      General Contractor Pro</p>
    `;
  }

  // Additional email templates...
}
```

#### **3. Test Integration**
```typescript
// tests/integration/automated-email-tests.ts
import { GmailTestSender } from './gmail-sender';

describe('Automated Email Testing', () => {
  const emailSender = new GmailTestSender();

  test('should send and process construction emails end-to-end', async () => {
    // 1. Send test email from contractor
    await emailSender.sendConstructionEmail('quote', { cost: '47,500' });
    
    // 2. Wait for webhook processing
    await new Promise(resolve => setTimeout(resolve, 30000));
    
    // 3. Verify email was received and processed
    const processedEmails = await prisma.emailMessage.findMany({
      where: {
        sender: 'nailit.test.contractor@gmail.com',
        subject: { contains: 'Kitchen Renovation Quote' }
      }
    });
    
    expect(processedEmails).toHaveLength(1);
    expect(processedEmails[0].urgencyLevel).toBe('medium');
    expect(processedEmails[0].relevanceScore).toBeGreaterThan(0.8);
  });

  test('should handle urgent inspection emails', async () => {
    await emailSender.sendConstructionEmail('inspection', { time: '9:00 AM' });
    
    // Wait and verify urgent processing
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    const urgentEmails = await prisma.emailMessage.findMany({
      where: {
        urgencyLevel: 'high',
        subject: { contains: 'URGENT' }
      }
    });
    
    expect(urgentEmails).toHaveLength(1);
  });
});
```

### **Setup Commands**

Add to `package.json`:
```json
{
  "scripts": {
    "test:gmail:setup": "tsx scripts/gmail-oauth-setup.ts",
    "test:gmail:send": "tsx tests/integration/send-test-emails.ts",
    "test:email:automated": "jest tests/integration/automated-email-tests.ts",
    "test:email:full": "npm run test:email:db && npm run test:gmail:send && npm run test:email:automated"
  }
}
```

### **Workflow Integration**

#### **Development Workflow**
```bash
# 1. One-time OAuth setup (contractor account)
npm run test:gmail:setup

# 2. Daily testing - send automated emails
npm run test:gmail:send

# 3. Full end-to-end testing
npm run test:email:full
```

#### **CI/CD Integration**
```yaml
# .github/workflows/email-testing.yml
- name: Run Automated Email Tests
  run: |
    npm run test:email:db           # Load historical data
    npm run test:gmail:send         # Send real emails  
    npm run test:email:automated    # Verify processing
  env:
    GMAIL_CONTRACTOR_CLIENT_ID: ${{ secrets.GMAIL_CONTRACTOR_CLIENT_ID }}
    GMAIL_CONTRACTOR_CLIENT_SECRET: ${{ secrets.GMAIL_CONTRACTOR_CLIENT_SECRET }}
    GMAIL_CONTRACTOR_REFRESH_TOKEN: ${{ secrets.GMAIL_CONTRACTOR_REFRESH_TOKEN }}
```

### **Benefits of This Approach**

✅ **Fully Automated**: No manual email sending required  
✅ **Realistic Testing**: Actual emails between real test accounts  
✅ **End-to-End Validation**: Tests complete Gmail webhook pipeline  
✅ **Repeatable**: Consistent test scenarios every time  
✅ **CI/CD Ready**: Can run in automated pipelines  
✅ **Flexible**: Easy to add new email types and scenarios

---

## 🎯 **Success Criteria**

### **Performance Benchmarks**
- **Historical Import**: Process 50 emails in <2 minutes
- **Real-time Processing**: Webhook to classification in <30 seconds
- **Filtering Efficiency**: 100% accuracy in team member filtering
- **Reliability**: <5% error rate, 99.5% uptime

### **Functional Requirements**
- ✅ OAuth flow completes successfully
- ✅ Webhook processing handles Gmail notifications
- ✅ Team member filtering at source (before processing)
- ✅ Email content fetched and stored securely
- ✅ AI analysis produces accurate classifications
- ✅ Flagged items created for cost/schedule changes
- ✅ Attachments stored in S3 with proper encryption
- ✅ Dashboard displays emails chronologically

### **Filtering Validation**
- ✅ Only emails FROM team members are processed
- ✅ Marketing/spam emails never enter the system
- ✅ Personal emails from team members still processed (but lower relevance)
- ✅ Unknown senders automatically filtered out

### **Security & Privacy**
- ✅ All email content encrypted at rest
- ✅ OAuth tokens securely stored and refreshed
- ✅ Webhook signatures verified
- ✅ User data access properly scoped
- ✅ Audit trail for all email processing

---

## 🚀 **Implementation Roadmap**

### **Phase 1: Foundation Testing (Week 1)** ✅ **COMPLETED**
- ✅ Set up test Gmail accounts
- ✅ Create comprehensive test fixtures with team member filtering
- ✅ Implement unit tests with mocks
- ✅ Build BDD test scenarios

### **Phase 2: Integration Testing (Week 2)**
- [ ] Deploy staging environment with email features
- [ ] Configure test Gmail OAuth credentials  
- [ ] Implement team member filtering in webhook processing
- [ ] Set up automated test email sending from team members

### **Phase 3: Performance & Load Testing (Week 3)**
- [ ] Test bulk import of 100+ emails (team members only)
- [ ] Simulate high-frequency real-time emails
- [ ] Validate filtering performance under load
- [ ] Optimize bottlenecks identified

### **Phase 4: Production Monitoring (Week 4)**  
- [ ] Deploy production email monitoring
- [ ] Set up alerting and metrics
- [ ] Implement health check endpoints
- [ ] Create runbook for troubleshooting

---

## 🔧 **Testing Tools & Commands**

### **Development Commands**
```bash
# Run specific email tests
npm run test tests/bdd/features/email-ingestion.test.tsx

# Test email fixtures validation
npm run test tests/fixtures/email-fixtures.test.ts

# Integration test with real Gmail (staging)
npm run test:staging:email

# Test team member filtering specifically
npm run test tests/unit/team-member-filtering.test.ts
```

### **Debugging & Troubleshooting**
```bash
# Check email processing logs
npm run logs:email

# Validate webhook connectivity
curl -X POST localhost:3000/api/email/webhook/gmail \
  -H "Content-Type: application/json" \
  -d @tests/fixtures/webhook-payload.json

# Test OAuth flow manually
open "http://localhost:3000/api/email/oauth/gmail?projectId=test-project"

# Test team member filtering
npm run test:filter-validation
```

---

## 📝 **Test Documentation**

### **BDD Test Scenarios**
All test scenarios written in Gherkin format for stakeholder review:

```gherkin
Feature: Team Member Email Filtering
  As a homeowner managing my renovation project
  I want only emails from my project team to be processed
  So that I don't get overwhelmed with irrelevant communications

Scenario: Team Member Email Processing
  Given I have defined my project team members
  And contractor@example.com is in my team member list
  When contractor@example.com sends me a project update
  Then the email is processed and classified
  And appears in my project timeline

Scenario: Non-Team Member Email Filtering
  Given marketing@homedepot.com is NOT in my team member list
  When marketing@homedepot.com sends me a promotional email
  Then the email is filtered out at the webhook level
  And never stored or processed
  And does not appear in my project timeline
```

### **Test Coverage Reports**
- Unit test coverage: Target >90%
- Integration test coverage: All critical paths
- BDD scenario coverage: All user stories
- Team member filtering: 100% accuracy
- Performance test coverage: All load scenarios

This **team member filtering approach** is much more efficient and accurate than content-based filtering, eliminating irrelevant emails at the source while ensuring all project communications are captured and processed.