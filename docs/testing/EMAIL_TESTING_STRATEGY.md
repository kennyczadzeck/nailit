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