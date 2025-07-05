# Email Ingestion Testing Strategy

## 🎯 **Testing Philosophy**

### **CRITICAL PRINCIPLE: Homeowner-Only Email Testing**

Our email ingestion testing strategy is built on the **homeowner-only principle**:
- **ONLY** test email ingestion from the homeowner's Gmail account (`nailit.test.homeowner@gmail.com`)
- **NEVER** access or test contractor Gmail accounts directly
- **CAPTURE** contractor emails when they send TO the homeowner
- **VALIDATE** complete conversation history through homeowner's inbox perspective

This approach addresses both key use cases:
1. **Historical Email Ingestion**: Bulk import of existing project emails from homeowner's Gmail
2. **Real-time Email Ingestion**: Live monitoring of homeowner's Gmail for new project emails

We use a **homeowner-centric multi-layered approach** that progresses from isolated unit tests to real-world integration testing.

---

## 🏠 **Homeowner-Only Testing Architecture**

### **Email Flow Testing Pattern**
```
┌─────────────────────────────────────────────────────────────────────┐
│                    HOMEOWNER-ONLY TEST PATTERN                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                TEST CONTRACTORS                                 │ │
│  │  nailit.test.contractor@gmail.com                              │ │
│  │  (ONLY used to SEND emails TO homeowner)                       │ │
│  └─────────────────────┬───────────────────────────────────────────┘ │
│                        │ SEND TEST EMAILS TO                       │
│                        ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │               TEST HOMEOWNER GMAIL                              │ │
│  │            nailit.test.homeowner@gmail.com                     │ │
│  │                  (ONLY SOURCE FOR INGESTION)                   │ │
│  └─────────────────────┬───────────────────────────────────────────┘ │
│                        │ NAILIT INGESTION TESTING                  │
│                        ▼                                           │
│  ┌─────────────────────────────────────────────────────────────────┐ │
│  │                 TEST DATABASE                                   │ │
│  │        Homeowner-Only Email Test Data                          │ │
│  └─────────────────────────────────────────────────────────────────┘ │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🧪 **Testing Layers**

### **Layer 1: Unit Tests with Homeowner-Focused Mock Data**
**Purpose**: Fast, reliable tests for homeowner-centric logic without external dependencies

**Implementation**:
- ✅ `tests/fixtures/email-fixtures.ts` - Homeowner-focused test data
- ✅ `tests/bdd/features/email-ingestion.test.tsx` - Homeowner-centric BDD scenarios  
- ✅ Mock Gmail API responses from homeowner's perspective

**Homeowner Test Data Coverage**:
```typescript
// Historical emails (from homeowner's Gmail inbox)
- 3 high-relevance contractor emails TO homeowner (quotes, permits, deliveries)
- 1 medium-relevance email TO homeowner (schedule updates)  
- 1 edge-case email TO homeowner (personal note from team member)
- 2 homeowner REPLY emails (showing bidirectional conversation)

// Real-time emails (arriving in homeowner's Gmail)
- Urgent inspection notifications TO homeowner
- Change orders with cost impacts TO homeowner
- Homeowner responses TO contractors
- Invalid/malformed emails for error handling

// Homeowner-Only Filtering Strategy
- ALL emails processed from homeowner's Gmail account perspective
- Contractor emails captured when they send TO homeowner
- Homeowner replies captured when homeowner sends TO contractors
- Complete conversation threads maintained through homeowner's inbox
```

**Key Homeowner-Centric Scenarios**:
- ✅ Bulk import of 50+ historical emails from homeowner's Gmail
- ✅ Real-time processing of homeowner's Gmail within 30-second SLA
- ✅ Attachment handling from homeowner's email content
- ✅ AI classification from homeowner's perspective
- ✅ Error handling for homeowner's Gmail connection issues

---

### **Layer 2: Staging Environment with Homeowner Test Gmail Account**

#### **Homeowner-Only Test Gmail Setup**
```
PRIMARY ACCOUNT (INGESTION SOURCE):
Test Homeowner Account: nailit.test.homeowner@gmail.com
Purpose: ONLY account used for email ingestion testing
OAuth Scope: gmail.readonly, gmail.modify (for cleanup)
Role: Nailit user (receives all project communications)

SECONDARY ACCOUNT (EMAIL SENDER ONLY):
Test Contractor Account: nailit.test.contractor@gmail.com  
Purpose: ONLY used to SEND emails TO homeowner (never accessed for ingestion)
OAuth Scope: gmail.send (for sending test emails only)
Role: Contractor (sends emails TO homeowner)

CRITICAL: Never access contractor Gmail for ingestion - only homeowner Gmail
```

#### **Homeowner-Focused Team Member Configuration**
```typescript
// Updated team member filtering for homeowner-only approach
teamMembers: [
  'nailit.test.contractor@gmail.com'     // Contractor (emails captured when sent TO homeowner)
]

// Homeowner-Only Filtering Logic:
// 1. Process ALL emails in homeowner's Gmail inbox
// 2. Filter to include only emails FROM/TO known team members
// 3. Capture both contractor→homeowner AND homeowner→contractor emails
// 4. Never access contractor Gmail directly
```

### **Layer 3: Homeowner Production Integration Testing**

#### **Homeowner Gmail API Integration**
```typescript
// Homeowner-only Gmail API testing
describe('Homeowner Gmail Integration', () => {
  test('should connect to homeowner Gmail only', async () => {
    // Test homeowner OAuth flow
    // Verify homeowner Gmail API access
    // Confirm no contractor Gmail access attempted
  });
  
  test('should process homeowner Gmail webhooks', async () => {
    // Test homeowner Gmail webhook setup
    // Verify homeowner email notifications
    // Confirm homeowner-only processing pipeline
  });
});
```

#### **Homeowner Historical Ingestion Testing**
```typescript
// Homeowner-focused historical ingestion
describe('Homeowner Historical Ingestion', () => {
  test('should discover emails from homeowner Gmail only', async () => {
    // Test Gmail API search on homeowner account
    // Verify date range filtering
    // Confirm project-relevant email discovery
  });
  
  test('should process homeowner email batches', async () => {
    // Test batch processing of homeowner emails
    // Verify rate limiting compliance
    // Confirm homeowner-only data storage
  });
});
```

---

## 📊 **Homeowner-Only Test Data Management**

### **Homeowner-Centric Email Test Set**
Pre-created realistic email conversations in homeowner's Gmail for consistent testing:

```typescript
// Homeowner test email scenarios
const homeownerTestScenarios = [
  {
    name: "Initial quote discussion",
    flow: "contractor→homeowner→contractor",
    emails: [
      "contractor sends quote TO homeowner",
      "homeowner replies with questions TO contractor", 
      "contractor responds with clarifications TO homeowner"
    ],
    source: "homeowner Gmail inbox" // All emails captured from here
  },
  {
    name: "Urgent plumbing issue",
    flow: "contractor→homeowner→contractor", 
    emails: [
      "contractor reports urgent issue TO homeowner",
      "homeowner acknowledges and asks for timeline TO contractor",
      "contractor provides repair schedule TO homeowner"
    ],
    source: "homeowner Gmail inbox" // Complete thread in homeowner's Gmail
  },
  {
    name: "Cabinet installation progress",
    flow: "contractor→homeowner",
    emails: [
      "contractor sends progress photos TO homeowner",
      "contractor requests homeowner approval TO homeowner"
    ],
    source: "homeowner Gmail inbox" // Status updates to homeowner
  }
];
```

### **Homeowner OAuth and Credentials Management**
```typescript
// Homeowner-only credential configuration
const homeownerTestConfig = {
  // PRIMARY INGESTION ACCOUNT
  homeowner: {
    email: 'nailit.test.homeowner@gmail.com',
    purpose: 'Email ingestion and processing',
    access: 'Full Gmail API access for ingestion',
    credentialsFile: 'homeowner-credentials.json'
  },
  
  // SECONDARY SENDER ACCOUNT (for test email generation)
  contractor: {
    email: 'nailit.test.contractor@gmail.com', 
    purpose: 'Send test emails TO homeowner only',
    access: 'Gmail send only (never accessed for ingestion)',
    credentialsFile: 'contractor-send-only-credentials.json'
  }
};
```

---

## 🔄 **Homeowner-Only Testing Workflows**

### **Development Workflow**
```bash
# 1. Run homeowner-focused unit tests
npm run test:email:homeowner

# 2. Run homeowner BDD scenarios  
npm run test:bdd:homeowner -- features/homeowner-email-ingestion.feature

# 3. Run homeowner integration tests against staging
npm run test:integration:homeowner

# 4. Performance testing with homeowner email load simulation
npm run test:performance:homeowner
```

### **Homeowner Email Generation and Testing**
```bash
# Generate test emails FROM contractor TO homeowner
npm run test:send-emails-to-homeowner 10

# Generate conversation threads (captured in homeowner Gmail)
npm run test:send-conversations-to-homeowner 5

# Test historical ingestion from homeowner Gmail
npm run test:historical-ingestion-homeowner

# Clean up homeowner Gmail test emails
npm run test:cleanup-homeowner-gmail
```

---

## 🔍 **Homeowner-Only Validation and Monitoring**

### **Homeowner Data Validation**
```typescript
// Homeowner-only data validation tests
describe('Homeowner Data Validation', () => {
  test('should contain only homeowner-sourced emails', async () => {
    const emails = await prisma.emailMessage.findMany();
    
    // Verify all emails are from homeowner's perspective
    emails.forEach(email => {
      expect(email.userId).toBe(homeownerUserId);
      expect(email.provider).toBe('gmail');
      // Email should be TO homeowner OR FROM homeowner
      expect(
        email.recipients.includes(homeownerEmail) || 
        email.sender === homeownerEmail
      ).toBe(true);
    });
  });
  
  test('should never contain contractor-sourced emails', async () => {
    const emails = await prisma.emailMessage.findMany();
    
    // Verify no emails were ingested from contractor accounts
    emails.forEach(email => {
      expect(email.providerData?.sourceAccount).not.toBe('contractor');
      expect(email.providerData?.ingestedFrom).toBe('homeowner');
    });
  });
});
```

### **Homeowner OAuth Compliance**
```typescript
// Homeowner-only OAuth validation
describe('Homeowner OAuth Compliance', () => {
  test('should only have homeowner OAuth sessions', async () => {
    const oauthSessions = await prisma.oAuthSession.findMany({
      where: { provider: 'google', sessionContext: 'email_api' }
    });
    
    // Verify all OAuth sessions are for homeowner
    oauthSessions.forEach(session => {
      expect(session.userId).toBe(homeownerUserId);
    });
  });
});
```

---

## 📋 **Homeowner-Only Testing Checklist**

### **Pre-Test Validation**
- [ ] Homeowner Gmail OAuth configured and working
- [ ] Contractor Gmail configured for sending only (not ingestion)
- [ ] Test database contains only homeowner-sourced emails
- [ ] All test scripts target homeowner Gmail account only

### **Test Execution Validation**
- [ ] Email generation sends TO homeowner Gmail only
- [ ] Email ingestion processes FROM homeowner Gmail only  
- [ ] No contractor Gmail access attempted during testing
- [ ] All conversation threads captured through homeowner perspective

### **Post-Test Validation**
- [ ] Database contains only homeowner-perspective emails
- [ ] All email records have homeowner user ID
- [ ] No contractor OAuth sessions created
- [ ] All test emails cleaned up from homeowner Gmail

### **Compliance Verification**
- [ ] No contractor email accounts accessed for ingestion
- [ ] All email analysis from homeowner's perspective
- [ ] All project associations link to homeowner's projects
- [ ] All AI classifications serve homeowner's needs

---

This comprehensive homeowner-only testing strategy ensures that all email ingestion testing respects the critical architectural principle while providing thorough validation of the complete email communication capture and processing pipeline.