# 🚀 E2E Testing Quick Start Guide

*Get started with end-to-end email processing testing in 5 minutes*

## 🏗️ **Two-Layer Testing Architecture**

### **📧 Email Testing (Foundation Layer) - MUST RUN FIRST**
- **Purpose**: Validate email infrastructure without AI processing
- **Cost**: Free (no AI processing costs)
- **Scope**: Database setup → OAuth → Email generation → Gmail ingestion → Validation

### **🤖 E2E Testing (Extension Layer) - RUNS AFTER FOUNDATION**
- **Purpose**: AI processing and visualization on top of email foundation
- **Cost**: ~$0.08-0.16 per test (AI processing)
- **Scope**: Email foundation → AI analysis → Flagged items → Timeline

**⚠️ CRITICAL**: E2E testing can ONLY run after email foundation is complete and verified.

## 📋 **Prerequisites**

### **Required Setup**
1. **Environment Variables**: Copy `.env.local` with OAuth credentials
2. **OAuth Tokens**: Run `npm run test:oauth-setup homeowner` and `npm run test:oauth-setup contractor`
3. **Database**: Ensure Neon database is accessible
4. **OpenAI API Key**: Set `OPENAI_API_KEY` in `.env.local`

### **Clean State Guarantee**
The E2E test runner automatically ensures a clean state by:
- 🧹 **Gmail Cleanup**: Moves existing test emails to trash (recoverable)
- 🗄️ **Database Reset**: Truncates all test data
- 🔄 **Fresh Setup**: Creates new users, projects, and team members

**Note**: Gmail cleanup is safe and recoverable - emails are moved to trash, not permanently deleted.

## 🎯 **Quick Commands**

### **Email Foundation Testing (Free)**
```bash
# Complete email infrastructure testing
npm run test:email:master

# Foundation-focused testing
npm run test:email:foundation

# Quick foundation validation
npm run test:email:smoke
```

### **E2E Extension Testing (AI Costs)**
*Only run after email foundation passes*

```bash
# Basic AI processing (recommended for development)
npm run test:e2e:ai-basic

# Complete E2E workflow (pre-deployment)
npm run test:e2e:complete

# Verbose output for debugging
npm run test:e2e:complete:verbose
```

## 📊 **What Gets Tested**

### **Email Foundation Layer**
1. **Database Setup** - Create users, projects, team members
2. **OAuth Verification** - Validate credentials for both accounts
3. **Email Generation** - Send realistic contractor emails
4. **Gmail Ingestion** - Fetch and filter team member emails
5. **Infrastructure Validation** - Verify email storage and processing

### **E2E Extension Layer**
*Only runs after email foundation is complete*

6. **AI Processing** - Analyze emails with GPT-4o
7. **Output Storage** - Create EmailAnalysis records
8. **Flagged Items** - Generate actionable items from AI analysis
9. **Timeline Integration** - Convert flagged items to timeline entries
10. **Workflow Validation** - Verify complete pipeline

## 🔄 **Proper Testing Workflow**

### **Step 1: Email Foundation (Required)**
```bash
# Validate email infrastructure first
npm run test:email:foundation
```

**Success Criteria:**
- ✅ Users and projects created in database
- ✅ OAuth credentials valid for both accounts
- ✅ Emails successfully generated and sent
- ✅ Gmail ingestion working correctly
- ✅ EmailMessage records in database

### **Step 2: E2E Extensions (Optional)**
*Only run after Step 1 passes*

```bash
# For development: Basic AI processing
npm run test:e2e:ai-basic

# For deployment: Complete workflow
npm run test:e2e:complete
```

**Success Criteria:**
- ✅ AI analysis generates valid results
- ✅ EmailAnalysis records created
- ✅ Flagged items generated appropriately
- ✅ Timeline entries created
- ✅ Frontend displays data correctly

## 🔧 **Troubleshooting**

### **Common Issues**

**OAuth Expired**
```bash
npm run test:oauth:refresh
```

**Database Connection**
```bash
# Check database connectivity
npm run db:studio
```

**AI API Issues**
```bash
# Check OpenAI API key
echo $OPENAI_API_KEY

# Test AI endpoint
curl -X POST http://localhost:3000/api/email/analyze \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

**Gmail Quota**
```bash
# Check Gmail API quota
npm run test:gmail:status
```

### **Debug Commands**
```bash
# Check system status
npm run test:oauth:status

# Validate database state
npm run test:validate:e2e

# Clean Gmail test emails
npm run test:gmail:cleanup-all
```

## 📈 **Expected Results**

### **Typical Test Run**
```
🚀 Starting Complete End-to-End Test
=====================================

🔄 Step 1/8: Data Cleanup
✅ Data Cleanup completed (1,234ms)

🔄 Step 2/8: Homeowner Setup  
✅ Homeowner Setup completed (2,567ms)

🔄 Step 3/8: Email Generation
✅ Email Generation completed (8,901ms)

🔄 Step 4/8: Email Ingestion
✅ Email Ingestion completed (3,456ms)

🔄 Step 5/8: AI Processing
✅ AI Processing completed (12,345ms)

🔄 Step 6/8: Flagged Items Creation
✅ Flagged Items Creation completed (1,890ms)

🔄 Step 7/8: Timeline Integration
✅ Timeline Integration completed (1,234ms)

🔄 Step 8/8: E2E Validation
✅ E2E Validation completed (2,345ms)

🎉 Complete End-to-End Test PASSED!
📊 Total Duration: 34.0 seconds
📋 Steps Completed: 8/8
✅ Successful: 8
⚠️  Failed: 0
```

### **Validation Summary**
```
📊 End-to-End Workflow Results:
   Project: Kitchen Renovation Test Project
   Team Members: 2
   Ingested Emails: 15
   AI Analyses: 15
   Flagged Items: 8
   Timeline Entries: 5

✅ Validation Checks:
   ✅ PASS Test homeowner account exists
   ✅ PASS Project properly configured
   ✅ PASS Team members configured
   ✅ PASS Email settings configured
   ✅ PASS Emails ingested
   ✅ PASS AI analysis completed
   ✅ PASS High analysis coverage (100.0%)
   ✅ PASS Flagged items created
   ✅ PASS Timeline entries created
   ✅ PASS High average confidence (87.3%)

📈 Validation Results:
   Overall Success Rate: 100.0% (10/10)
   Critical Success Rate: 100.0% (6/6)
   Critical Failures: 0

🎉 End-to-end workflow validation PASSED!
```

## 🔄 **Continuous Integration**

### **GitHub Actions Integration**
```yaml
# .github/workflows/e2e-test.yml
name: E2E Email Processing Test

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  e2e-test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run E2E Tests
      run: npm run test:e2e:complete
      env:
        DATABASE_URL: ${{ secrets.DATABASE_URL }}
        OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        GMAIL_CLIENT_ID: ${{ secrets.GMAIL_CLIENT_ID }}
        GMAIL_CLIENT_SECRET: ${{ secrets.GMAIL_CLIENT_SECRET }}
```

### **Local Development**
```bash
# Run before commits
npm run test:e2e:complete

# Run during development
npm run test:e2e:complete:verbose
```

## 🎯 **Next Steps**

After successful E2E testing:

1. **Production Deployment** - Deploy to staging/production
2. **Real Email Testing** - Test with actual project emails
3. **Performance Monitoring** - Monitor AI processing costs
4. **User Acceptance Testing** - Validate with real users
5. **Feedback Integration** - Implement user feedback loops

## 📚 **Additional Resources**

- [Complete E2E Testing Playbook](./END_TO_END_TESTING_PLAYBOOK.md)
- [Email Testing Strategy](./EMAIL_TESTING_STRATEGY.md)
- [AI Strategy Documentation](../architecture/ai-strategy-analysis.md)
- [Gmail OAuth Setup](./GMAIL_API_OAUTH_SETUP.md)

## 🌐 **Web App Testing After E2E**

### **Accessing Test Data in Web App**
After running E2E tests, you can view the results in the web application:

1. **Start the development server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to the app**: http://localhost:3000

3. **Sign in with the test account**:
   - Click "Sign in with Google"
   - Use: `nailit.test.homeowner@gmail.com`
   - The enhanced NextAuth configuration will automatically link your test user

4. **View test results**:
   - ✅ **Project**: Test Kitchen Renovation
   - ✅ **Emails**: All ingested emails from E2E test
   - ✅ **AI Analyses**: Classifications, priorities, confidence scores
   - ✅ **Timeline**: AI-generated timeline entries
   - ✅ **Flagged Items**: Actionable items from email analysis

### **Troubleshooting Authentication**
If you see "Create a project" instead of the test project:

```bash
# The NextAuth configuration should handle this automatically
# But if needed, you can run:
npm run test:fix-auth
```

**Note**: The first time you authenticate with the test account, NextAuth will automatically create the OAuth account linkage. This ensures seamless integration between E2E test data and web app authentication.

---

**Need Help?** Check the [troubleshooting guide](./END_TO_END_TESTING_PLAYBOOK.md#troubleshooting-guide) or run `npm run test:e2e:complete:verbose` for detailed output. 

## Overview

This guide covers end-to-end testing for the Nailit email processing system. The E2E tests use **real OAuth authentication** to ensure compatibility with both API and web app authentication flows.

## Key Principles

### OAuth Authentication Strategy
- **E2E Tests**: Use real OAuth flow to create user + account + session
- **Web App**: Use same OAuth, finds existing user and creates new session
- **No Mocking**: Both flows use the same authentication mechanism
- **Session Isolation**: API and web app sessions coexist independently

### Test User Setup
- Email: `nailit.test.homeowner@gmail.com`
- Created with proper OAuth account linkage
- Ready for both API and web app authentication
- Projects and team members pre-configured

## Quick Start

### 1. Verify OAuth Setup
```bash
# Check that test user has proper OAuth account
npx tsx scripts/verify-oauth-setup.ts

# Test OAuth flow for both API and web app
npx tsx scripts/test-oauth-flow.ts
```

### 2. Set Up Test Project
```bash
# Create test project with OAuth user
npx tsx scripts/email-testing/data-manager.ts setup-single-contractor-project
```

### 3. Run E2E Tests
```bash
# Run email analysis tests
npx tsx scripts/test-email-analysis-integration.ts

# Run comprehensive E2E tests
npm run test:e2e
```

### 4. Test Web App Authentication
1. Start the dev server: `npm run dev`
2. Navigate to `/auth/signin`
3. Sign in with `nailit.test.homeowner@gmail.com`
4. NextAuth will find the existing user and create a new session
5. Both API and web app sessions will coexist

## Architecture

### OAuth Flow
```
E2E Tests (API) ──┐
                  ├── Same OAuth Account ──> User Record
Web App (NextAuth)──┘
```

### Session Management
- **API Session**: Created during E2E test setup
- **Web Session**: Created when user signs in via web app
- **Independence**: Both sessions work simultaneously
- **No Conflicts**: Different session tokens, same user

### Database Structure
```sql
-- User (shared)
User { id, email, name, emailVerified }

-- OAuth Account (shared)
Account { userId, provider: 'google', providerAccountId, access_token }

-- Sessions (separate)
Session { sessionToken, userId, expires } -- Web app session
OAuthSession { userId, provider, accessToken } -- API session
```

## Test Data Management

### Clean Up Test Data
```bash
# Clean all test data
npx tsx scripts/email-testing/data-manager.ts truncate-all

# Clean only emails
npx tsx scripts/email-testing/data-manager.ts truncate-db
```

### Reset Test User
```bash
# Recreate test user with OAuth
npx tsx scripts/email-testing/data-manager.ts setup-single-contractor-project

# Verify setup
npx tsx scripts/verify-oauth-setup.ts
```

## Troubleshooting

### "User not found" in E2E tests
```bash
# Recreate test user with proper OAuth
npx tsx scripts/email-testing/data-manager.ts setup-single-contractor-project
```

### "Authentication failed" in web app
1. Check that OAuth account exists: `npx tsx scripts/verify-oauth-setup.ts`
2. Ensure test user has proper OAuth account linkage
3. Verify NextAuth configuration in `app/api/auth/[...nextauth]/route.ts`

### "No projects found"
```bash
# Verify test project exists
npx tsx scripts/verify-oauth-setup.ts

# Recreate if needed
npx tsx scripts/email-testing/data-manager.ts setup-single-contractor-project
```

## Key Files

### OAuth Setup
- `scripts/email-testing/data-manager.ts` - Creates users with OAuth accounts
- `scripts/verify-oauth-setup.ts` - Verifies OAuth account linkage
- `scripts/test-oauth-flow.ts` - Tests both API and web app flows

### E2E Tests
- `scripts/test-email-analysis-integration.ts` - Email analysis E2E tests
- `tests/e2e/` - Comprehensive E2E test suite

### Authentication
- `app/api/auth/[...nextauth]/route.ts` - NextAuth configuration
- `app/lib/prisma.ts` - Database connection

## Success Indicators

✅ **OAuth Setup Complete**
- User exists with OAuth account
- Access token present and valid
- Projects and team members configured

✅ **E2E Tests Ready**
- Test user authenticated via OAuth
- API calls work with real authentication
- Email analysis processes correctly

✅ **Web App Compatible**
- Same user can sign in via web app
- NextAuth finds existing user
- Sessions coexist independently

## Next Steps

1. **Run E2E Tests**: Use real OAuth authentication
2. **Test Web App**: Sign in with test user
3. **Verify Integration**: Both flows work simultaneously
4. **Scale Up**: Add more test scenarios as needed

This approach eliminates the complexity of mocking authentication while ensuring both API and web app authentication work seamlessly together. 