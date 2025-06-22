# Email Ingestion Development Workflow

## 🎯 **Development Philosophy**

### **Core Principles**
- **Feature-Branch Development**: Each phase gets its own feature branch from `develop`
- **Test-Driven Development**: BDD tests written before implementation
- **Incremental Deployment**: Each phase deployed to staging for validation
- **Risk Mitigation**: Never break existing functionality

---

## 🌳 **Git Branching Strategy**

### **Branch Structure**
```
main (production)
├── develop (integration)
│   ├── feature/email-phase-1-foundation
│   ├── feature/email-phase-2-ai-analysis  
│   ├── feature/email-phase-3-project-association
│   ├── feature/email-phase-4-dashboard-integration
│   └── feature/email-phase-5-multi-provider
└── hotfix/* (emergency fixes)
```

### **Phase-Based Development Flow**

#### **Phase 1: Foundation (Weeks 1-3)**
```bash
# Create feature branch from develop
git checkout develop
git pull origin develop
git checkout -b feature/email-phase-1-foundation

# Development workflow
git add .
git commit -m "feat(email): implement Gmail OAuth flow"
git push origin feature/email-phase-1-foundation

# Create PR: feature/email-phase-1-foundation → develop
# After review & tests pass → merge to develop
# Deploy develop to staging for validation
# After validation → merge develop to main
# Deploy main to production
```

#### **Branch Naming Convention**
- `feature/email-phase-{number}-{description}`
- `feature/email-oauth-gmail-integration`
- `feature/email-ai-analysis-engine`
- `feature/email-dashboard-timeline`
- `hotfix/email-webhook-security-fix`

---

## 📋 **Development Process by Phase**

### **Phase 1: Foundation Infrastructure**

#### **Week 1: Database & Infrastructure**
**Branch**: `feature/email-phase-1-database`

**Development Steps:**
1. **Create Database Schema**
   ```bash
   # Create migration file
   npx prisma migrate dev --name add-email-models
   
   # Update schema.prisma with EmailMessage, EmailAttachment, EmailProvider
   # Test migration in development environment
   ```

2. **Update CDK Infrastructure**
   ```bash
   # Add email processing queues and Lambda functions
   cd infrastructure
   npm run deploy -- --profile dev
   
   # Test infrastructure deployment
   # Verify SQS queues and S3 buckets created
   ```

3. **Environment Variables**
   ```bash
   # Add to .env.local for development
   GMAIL_CLIENT_ID=your_gmail_client_id
   GMAIL_CLIENT_SECRET=your_gmail_client_secret
   OPENAI_API_KEY=your_openai_api_key
   
   # Add to Amplify environment variables for staging/production
   ```

**Exit Criteria:**
- [ ] Database migration runs successfully in all environments
- [ ] CDK infrastructure deployed without errors
- [ ] Environment variables configured correctly
- [ ] Basic API routes return 200 status

#### **Week 2: OAuth Implementation**
**Branch**: `feature/email-phase-1-oauth`

**Development Steps:**
1. **Create OAuth Routes**
   ```typescript
   // app/api/email/oauth/gmail/route.ts
   // app/api/email/oauth/gmail/callback/route.ts
   // Test OAuth flow locally
   ```

2. **Provider Management UI**
   ```typescript
   // app/email/settings/page.tsx
   // Components for connecting/disconnecting providers
   // Test UI functionality
   ```

3. **Token Storage & Encryption**
   ```typescript
   // lib/email/oauth-manager.ts
   // Secure token storage with encryption
   // Token refresh automation
   ```

**Testing Requirements:**
```bash
# Unit tests
npm run test -- tests/email/oauth.test.ts

# Integration tests  
npm run test:integration -- tests/email/oauth-flow.test.ts

# BDD tests
npm run test:bdd -- features/email-oauth.feature
```

**Exit Criteria:**
- [ ] OAuth flow completes successfully
- [ ] Tokens stored securely and encrypted
- [ ] Token refresh works automatically
- [ ] UI shows correct connection status
- [ ] All tests passing

#### **Week 3: Basic Email Ingestion**
**Branch**: `feature/email-phase-1-ingestion`

**Development Steps:**
1. **Webhook Handlers**
   ```typescript
   // app/api/email/webhook/gmail/route.ts
   // Webhook signature verification
   // Message queuing for processing
   ```

2. **Email Content Fetching**
   ```typescript
   // lib/email/content-fetcher.ts
   // Fetch full email via Gmail API
   // Handle attachments and threading
   ```

3. **S3 Storage Pipeline**
   ```typescript
   // lib/email/storage.ts
   // Store email content with encryption
   // Organize by user/project structure
   ```

**Testing Requirements:**
```bash
# Test webhook processing
curl -X POST http://localhost:3000/api/email/webhook/gmail \
  -H "Content-Type: application/json" \
  -d '{"test": "webhook"}'

# Test content fetching with mock data
npm run test -- tests/email/content-fetcher.test.ts

# Integration test with real Gmail (staging only)
npm run test:staging -- tests/email/end-to-end.test.ts
```

**Exit Criteria:**
- [ ] Webhooks receive and process notifications
- [ ] Email content fetched completely
- [ ] Content stored securely in S3
- [ ] Database metadata accurate
- [ ] No data loss in pipeline

### **Phase 2: AI Analysis Engine**

#### **Week 4: AI Service Foundation**
**Branch**: `feature/email-phase-2-ai-foundation`

**Development Steps:**
1. **OpenAI Integration**
   ```typescript
   // lib/ai/openai-client.ts
   // Initialize OpenAI with proper error handling
   // Rate limiting and retry logic
   ```

2. **Relevance Scoring**
   ```typescript
   // lib/ai/relevance-analyzer.ts
   // Analyze email relevance to construction projects
   // Context-aware scoring algorithm
   ```

3. **Email Classification**
   ```typescript
   // lib/ai/email-classifier.ts
   // Classify emails by type (quote, invoice, schedule, etc.)
   // Multi-label classification support
   ```

**Testing Requirements:**
```typescript
// Create test datasets for AI accuracy
const testEmails = [
  {
    subject: "Electrical quote for kitchen renovation",
    expected: { category: "quote", relevance: 0.95 }
  },
  {
    subject: "Weekend BBQ invitation", 
    expected: { category: "other", relevance: 0.1 }
  }
];

// Accuracy tests
describe('AI Analysis Accuracy', () => {
  test('should achieve >90% relevance scoring accuracy', async () => {
    const results = await testRelevanceScoring(testEmails);
    expect(results.accuracy).toBeGreaterThan(0.9);
  });
});
```

**Exit Criteria:**
- [ ] Relevance scoring accuracy >90%
- [ ] Classification accuracy >85%
- [ ] Response time <30 seconds per email
- [ ] Error handling for API failures
- [ ] Cost optimization implemented

#### **Week 5: Advanced Analysis**
**Branch**: `feature/email-phase-2-advanced-analysis`

**Development Steps:**
1. **Entity Extraction**
   ```typescript
   // lib/ai/entity-extractor.ts
   // Extract amounts, dates, contacts, addresses
   // Construction-specific entity recognition
   ```

2. **Urgency Detection**
   ```typescript
   // lib/ai/urgency-detector.ts
   // Detect urgent language and deadlines
   // Score urgency levels accurately
   ```

3. **Action Item Extraction**
   ```typescript
   // lib/ai/action-extractor.ts
   // Extract actionable tasks from content
   // Identify deadlines and assignees
   ```

**Testing Requirements:**
```typescript
// Entity extraction tests
const entityTests = [
  {
    content: "Please review the $15,000 quote by Friday",
    expected: {
      amounts: [15000],
      dates: ["2025-01-17"], // assuming today is Monday
      urgency: "high"
    }
  }
];

// Comprehensive accuracy testing
npm run test:accuracy -- tests/ai/entity-accuracy.test.ts
```

**Exit Criteria:**
- [ ] Entity extraction >80% accuracy
- [ ] Urgency detection >75% accuracy  
- [ ] Action items extracted correctly
- [ ] Performance optimized
- [ ] Confidence scores calibrated

#### **Week 6: Analysis Integration**
**Branch**: `feature/email-phase-2-integration`

**Development Steps:**
1. **Pipeline Integration**
   ```typescript
   // lib/email/analysis-pipeline.ts
   // Integrate all AI services
   // Parallel processing for efficiency
   ```

2. **Result Storage**
   ```typescript
   // lib/email/analysis-storage.ts
   // Store analysis results in database
   // Update email processing status
   ```

3. **Feedback System**
   ```typescript
   // app/api/email/analysis/feedback/route.ts
   // Collect user feedback on AI accuracy
   // Improve models over time
   ```

**Testing Requirements:**
```bash
# End-to-end analysis pipeline test
npm run test:pipeline -- tests/email/full-analysis.test.ts

# Performance testing
npm run test:performance -- tests/email/load-test.test.ts

# Accuracy validation
npm run test:validate -- tests/email/accuracy-validation.test.ts
```

**Exit Criteria:**
- [ ] Full analysis pipeline functional
- [ ] Results stored correctly
- [ ] Feedback system working
- [ ] Performance meets requirements
- [ ] All accuracy targets met

### **Phase 3: Project Association**

#### **Week 7: Association Algorithm**
**Branch**: `feature/email-phase-3-association`

**Development Steps:**
1. **Participant Matching**
   ```typescript
   // lib/email/participant-matcher.ts
   // Match email participants to project contacts
   // Handle name variations and aliases
   ```

2. **Content Analysis**
   ```typescript
   // lib/email/content-analyzer.ts  
   // Analyze content for project references
   // Address and keyword matching
   ```

3. **Confidence Scoring**
   ```typescript
   // lib/email/association-scorer.ts
   // Calculate association confidence
   // Weight different matching factors
   ```

**Exit Criteria:**
- [ ] Participant matching >90% accuracy
- [ ] Content analysis working correctly
- [ ] Confidence scores calibrated
- [ ] Association algorithm tested

#### **Week 8: Multi-Project Support**
**Branch**: `feature/email-phase-3-multi-project`

**Development Steps:**
1. **Multi-Project Detection**
   ```typescript
   // lib/email/multi-project-detector.ts
   // Detect emails referencing multiple projects
   // Primary vs secondary associations
   ```

2. **Manual Override System**
   ```typescript
   // app/api/email/association/override/route.ts
   // Allow users to correct associations
   // Learn from user corrections
   ```

**Exit Criteria:**
- [ ] Multi-project detection working
- [ ] Manual override functional
- [ ] Learning from corrections
- [ ] Association accuracy >80%

---

## 🧪 **Testing Workflow**

### **Test-Driven Development Process**

#### **1. Write BDD Tests First**
```gherkin
# tests/bdd/features/email-oauth.feature
Feature: Gmail OAuth Integration
  As a project manager
  I want to connect my Gmail account
  So that NailIt can monitor my project emails

Scenario: Successful Gmail Connection
  Given I am logged into NailIt
  When I click "Connect Gmail"
  And I complete the Google OAuth flow
  Then my Gmail account is connected
  And I see "Connected" status in settings
```

#### **2. Implement Feature to Pass Tests**
```typescript
// Implement minimum code to make tests pass
// Focus on the specific acceptance criteria
// Don't over-engineer the solution
```

#### **3. Refactor and Optimize**
```typescript
// Clean up code after tests pass
// Optimize performance if needed
// Add error handling and edge cases
```

### **Testing Commands**

#### **Development Testing**
```bash
# Run all tests for specific feature
npm run test:feature email-oauth

# Run specific test file
npm run test tests/email/oauth.test.ts

# Run tests in watch mode during development
npm run test:watch

# Run BDD tests for current feature
npm run test:bdd features/email-oauth.feature
```

#### **Pre-Commit Testing**
```bash
# Run before committing
npm run test:pre-commit

# This runs:
# - Unit tests for changed files
# - Integration tests for affected modules
# - Linting and type checking
# - BDD tests for modified features
```

#### **Pre-Merge Testing**
```bash
# Run before merging PR
npm run test:full

# This runs:
# - All unit tests
# - All integration tests  
# - All BDD tests
# - Performance tests
# - Security tests
```

### **Test Coverage Requirements**

#### **Minimum Coverage Thresholds**
```json
{
  "coverageThreshold": {
    "global": {
      "branches": 80,
      "functions": 85,
      "lines": 85,
      "statements": 85
    },
    "src/lib/email/": {
      "branches": 90,
      "functions": 95,
      "lines": 95,
      "statements": 95
    }
  }
}
```

#### **Critical Path Testing**
- OAuth flow: 100% coverage required
- Webhook processing: 100% coverage required  
- AI analysis: 95% coverage required
- Data storage: 100% coverage required

---

## 🚀 **Deployment Pipeline**

### **Environment Progression**

#### **Development → Staging → Production**
```bash
# 1. Development (local)
npm run dev
# Test all functionality locally
# Run full test suite

# 2. Staging (feature branch)
git push origin feature/email-phase-1-foundation
# Automatic deployment to staging environment
# Run integration tests against staging
# Manual QA testing

# 3. Production (main branch)
git checkout develop
git merge feature/email-phase-1-foundation
git push origin develop
# Deploy develop to staging for final validation

git checkout main  
git merge develop
git push origin main
# Deploy to production with monitoring
```

### **Automated Deployment Checks**

#### **Pre-Deployment Validation**
```yaml
# .github/workflows/email-feature-deployment.yml
name: Email Feature Deployment

on:
  push:
    branches: [feature/email-*]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - name: Run Unit Tests
        run: npm run test:unit
      
      - name: Run Integration Tests
        run: npm run test:integration
        
      - name: Run BDD Tests
        run: npm run test:bdd
        
      - name: Check Coverage
        run: npm run test:coverage
        
      - name: Security Scan
        run: npm run security:scan

  deploy-staging:
    needs: test
    runs-on: ubuntu-latest
    if: startsWith(github.ref, 'refs/heads/feature/email-')
    steps:
      - name: Deploy to Staging
        run: |
          # Deploy feature branch to staging environment
          # Run smoke tests against staging
          # Notify team of deployment
```

#### **Post-Deployment Monitoring**
```bash
# Health checks after deployment
curl -f https://staging.nailit.app/api/health/email
curl -f https://staging.nailit.app/api/email/providers

# Monitor key metrics
# - API response times
# - Error rates  
# - Queue processing times
# - AI analysis accuracy
```

### **Rollback Strategy**

#### **Automatic Rollback Triggers**
- Error rate >5% for 5 minutes
- API response time >10 seconds
- Database connection failures
- Critical security alerts

#### **Manual Rollback Process**
```bash
# Immediate rollback to previous version
git revert HEAD --no-edit
git push origin main

# Or rollback to specific commit
git reset --hard <previous-commit>
git push --force-with-lease origin main

# Restore database if needed
# Notify team and stakeholders
```

---

## 📊 **Progress Tracking**

### **Phase Completion Checklist**

#### **Phase 1: Foundation**
- [ ] Database schema deployed to all environments
- [ ] OAuth flow completely functional
- [ ] Webhook processing working
- [ ] Email content storage operational
- [ ] All tests passing (unit, integration, BDD)
- [ ] Code coverage >85%
- [ ] Security scan clean
- [ ] Performance benchmarks met
- [ ] Documentation updated
- [ ] Demo ready for stakeholder review

#### **Phase 2: AI Analysis** 
- [ ] Relevance scoring >90% accuracy
- [ ] Classification >85% accuracy
- [ ] Entity extraction functional
- [ ] Urgency detection working
- [ ] Analysis pipeline integrated
- [ ] Performance <30 seconds per email
- [ ] Error handling robust
- [ ] Cost optimization implemented
- [ ] Feedback system operational
- [ ] Accuracy validation complete

#### **Phase 3: Project Association**
- [ ] Association algorithm >80% accuracy
- [ ] Multi-project detection working
- [ ] Manual override system functional
- [ ] Confidence scoring calibrated
- [ ] Learning from corrections
- [ ] Performance optimized
- [ ] Edge cases handled
- [ ] Integration tests passing

### **Weekly Progress Reports**

#### **Report Template**
```markdown
## Week X Progress Report - Email Phase Y

### Completed This Week
- [ ] Feature implementation
- [ ] Tests written and passing
- [ ] Code reviewed and merged
- [ ] Deployed to staging
- [ ] QA testing complete

### Metrics
- Code coverage: X%
- Test pass rate: X%
- Performance: X seconds
- Accuracy: X%

### Blockers & Risks
- Issue 1: Description and mitigation plan
- Issue 2: Description and timeline

### Next Week Goals
- Goal 1: Specific deliverable
- Goal 2: Specific deliverable
```

### **Success Metrics Dashboard**

#### **Key Performance Indicators**
- Development velocity (story points per week)
- Test coverage percentage
- Bug escape rate (bugs found in production)
- Feature adoption rate (user usage)
- System reliability (uptime, error rates)
- AI accuracy scores (relevance, classification)

This comprehensive development workflow ensures systematic, test-driven development of the email ingestion feature with clear quality gates and progress tracking at every phase. 