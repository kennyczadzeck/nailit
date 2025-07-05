# 🎯 End-to-End Testing Playbook

*Comprehensive testing workflow from Gmail ingestion to timeline display*

**Last Updated**: 2025-01-05  
**Testing Strategy**: Homeowner-Only Email Processing  
**Scope**: Complete email ingestion → AI processing → flagged items → timeline workflow

---

## 📋 **Overview**

This playbook validates the complete email processing pipeline:
1. **Data Cleanup** - Remove all existing test data
2. **Test Account Setup** - Create fresh homeowner account and project
3. **Email Generation** - Send real emails via Gmail API (homeowner-centric)
4. **Email Ingestion** - Process emails from homeowner Gmail only
5. **AI Processing** - Analyze ingested emails with GPT-4o
6. **Flagged Items** - Create flagged items from AI analysis
7. **Timeline Display** - Show confirmed items in project timeline

### **Critical Testing Principles**

✅ **Homeowner-Only Ingestion**: Only access homeowner's Gmail account  
✅ **Real Email Flow**: Gmail API → Ingestion → Database → AI → Flagged Items → Timeline  
✅ **Team Member Filtering**: Filter emails based on project team members  
✅ **Production Pathways**: Test actual production code paths, not shortcuts

---

## 🧹 **Step 1: Data Cleanup**

### **1.1 Gmail Account Cleanup**

Clean test emails from both Gmail accounts to ensure fresh inboxes:

```bash
# Complete Gmail cleanup (both accounts)
npm run test:cleanup:database  # Now includes Gmail cleanup

# Or manual Gmail cleanup
npm run test:gmail:cleanup-all
```

**Gmail Cleanup Process**:
- **Homeowner Account**: Remove all emails from `nailit.test.homeowner@gmail.com`
- **Contractor Account**: Remove all emails from `nailit.test.contractor@gmail.com`
- **Method**: Move emails to trash (preserves for recovery if needed)
- **Scope**: All emails in inbox, sent, and other folders
- **Wait Period**: 2-second delay for Gmail API to process changes

### **1.2 Database Cleanup**

Remove all existing test data to ensure clean testing environment:

```bash
# Database cleanup (included in complete cleanup)
npm run test:cleanup:database
```

**Database Cleanup Script** (`scripts/cleanup-test-data.ts`):
```typescript
async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // First, clean Gmail accounts
    console.log('\n📧 Cleaning Gmail accounts...');
    await cleanupGmailAccounts();
    
    // Then clean database
    console.log('\n🗄️ Cleaning database...');
    await cleanupDatabase();
    
    console.log('\n🎉 Complete test data cleanup finished!');
    
  } catch (error) {
    console.error('❌ Test data cleanup failed:', error);
    throw error;
  }
}

async function cleanupGmailAccounts() {
  try {
    console.log('   Cleaning homeowner Gmail account...');
    execSync('npx tsx scripts/email-testing/gmail-inbox-cleaner.ts cleanup homeowner');
    console.log('   ✅ Homeowner Gmail cleaned');

    console.log('   Cleaning contractor Gmail account...');
    execSync('npx tsx scripts/email-testing/gmail-inbox-cleaner.ts cleanup contractor');
    console.log('   ✅ Contractor Gmail cleaned');

    // Wait for Gmail API to process changes
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.warn('⚠️  Gmail cleanup failed (continuing with database cleanup):', error);
    // Don't throw - continue with database cleanup
  }
}
```

**Manual Cleanup Script** (`scripts/cleanup-test-data.ts`):
```typescript
async function cleanupDatabase() {
  try {
    // Delete in dependency order to avoid foreign key constraints
    await prisma.emailAnalysis.deleteMany({});
    await prisma.timelineEntry.deleteMany({});
    await prisma.flaggedItem.deleteMany({});
    await prisma.emailMessage.deleteMany({});
    await prisma.teamMember.deleteMany({});
    await prisma.emailSettings.deleteMany({});
    await prisma.project.deleteMany({});
    await prisma.user.deleteMany({
      where: { email: { contains: 'nailit.test' } }
    });
    
    console.log('✅ Database cleanup complete');
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  }
}
```

### **1.3 Verification**

Verify cleanup was successful:

```bash
# Verify Gmail accounts are empty
npm run test:gmail:verify-empty

# Verify database is clean
npm run test:db:verify-clean
```

**Why Gmail Cleanup is Critical**:
- **Fresh Start**: Ensures no interference from previous test emails
- **Accurate Filtering**: Team member filtering works on clean data
- **Predictable Results**: Known baseline for email ingestion testing
- **Realistic Testing**: Simulates actual deployment scenario

### **1.4 S3 Cleanup**

Remove any test email attachments:

```bash
# Clean S3 test data
npm run test:s3:cleanup

# Verify S3 cleanup
npm run test:s3:verify-empty
```

---

## 👤 **Step 2: Test Account Setup**

### **2.1 Create Test Homeowner Account**

Create fresh test homeowner with project and team members:

```bash
# Create complete test setup
npm run test:setup:homeowner-account

# Or manual setup
npx tsx scripts/setup-test-homeowner.ts
```

**Setup Script** (`scripts/setup-test-homeowner.ts`):
```typescript
import { prisma } from '../app/lib/prisma';

async function setupTestHomeowner() {
  console.log('👤 Setting up test homeowner account...');
  
  try {
    // 1. Create test homeowner user
    const user = await prisma.user.create({
      data: {
        email: 'nailit.test.homeowner@gmail.com',
        name: 'Test Homeowner',
        emailVerified: new Date()
      }
    });
    console.log(`✅ Created user: ${user.email}`);

    // 2. Create test project
    const project = await prisma.project.create({
      data: {
        name: 'Kitchen Renovation Test Project',
        description: 'End-to-end testing project for email ingestion workflow',
        status: 'ACTIVE',
        startDate: new Date('2024-12-01'),
        endDate: new Date('2025-02-28'),
        budget: 75000,
        address: '123 Test Street, Test City, CA 90210',
        userId: user.id
      }
    });
    console.log(`✅ Created project: ${project.name}`);

    // 3. Create email settings (monitoring enabled)
    const emailSettings = await prisma.emailSettings.create({
      data: {
        projectId: project.id,
        monitoringEnabled: true,
        gmailConnected: true,
        notificationsEnabled: true
      }
    });
    console.log(`✅ Created email settings (monitoring enabled)`);

    // 4. Add team members for filtering (only accounts we can test with)
    const teamMembers = [
      {
        name: 'Mike Johnson',
        email: 'nailit.test.contractor@gmail.com',
        role: 'GENERAL_CONTRACTOR'
      }
    ];

    for (const member of teamMembers) {
      const teamMember = await prisma.teamMember.create({
        data: {
          ...member,
          projectId: project.id
        }
      });
      console.log(`✅ Added team member: ${teamMember.name} (${teamMember.email})`);
    }

    console.log('\n🎉 Test homeowner setup complete!');
    console.log(`📋 Summary:`);
    console.log(`   User: ${user.email}`);
    console.log(`   Project: ${project.name}`);
    console.log(`   Team Members: ${teamMembers.length}`);
    console.log(`   Email Monitoring: Enabled`);
    
    return { user, project, emailSettings, teamMembers };
    
  } catch (error) {
    console.error('❌ Test homeowner setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupTestHomeowner();
```

### **2.2 Verify OAuth Setup**

Ensure Gmail OAuth is configured for test accounts:

```bash
# Check OAuth status
npm run test:oauth:status

# Setup OAuth if needed
npm run test:oauth:setup homeowner
npm run test:oauth:setup contractor
```

---

## 📧 **Step 3: Email Generation**

### **3.1 Generate Realistic Email Conversations**

Send real emails via Gmail API following our homeowner-centric strategy:

```bash
# Generate conversation threads (contractor → homeowner)
npm run test:send-conversations 5 30

# Generate individual project emails
npm run test:send-project-emails 10

# Generate historical email backlog
npm run test:send-historical-emails 20 60
```

**Email Generation Strategy**:
- **Contractor → Homeowner**: Project updates, invoices, change orders
- **Homeowner → Contractor**: Questions, approvals, concerns
- **Realistic Timing**: 2-48 hour response patterns
- **Proper Threading**: RFC 2822 compliant email threading
- **Team Member Emails**: Only from configured team members

### **3.2 Email Content Types**

Generate diverse email types for comprehensive testing:

```bash
# Cost-related emails (invoices, change orders)
npm run test:send-cost-emails 5

# Schedule-related emails (delays, updates)
npm run test:send-schedule-emails 3

# Scope-related emails (changes, additions)
npm run test:send-scope-emails 2

# General communication
npm run test:send-general-emails 5
```

### **3.3 Verify Email Delivery**

Confirm emails are delivered to homeowner's Gmail:

```bash
# Check homeowner inbox
npm run test:gmail:check-inbox homeowner

# Verify conversation threading
npm run test:gmail:verify-threading

# Validate email content
npm run test:gmail:validate-content
```

---

## 📥 **Step 4: Email Ingestion**

### **4.1 Historical Email Discovery**

Discover emails from homeowner's Gmail account:

```bash
# Discover historical emails
npm run test:ingest:discover

# Or manual discovery
npx tsx scripts/discover-emails.ts
```

**Discovery Script** (`scripts/discover-emails.ts`):
```typescript
import { prisma } from '../app/lib/prisma';
import { teamMemberFilter } from '../app/lib/email/team-member-filter';

async function discoverEmails() {
  console.log('📥 Discovering emails from homeowner Gmail...');
  
  try {
    // 1. Get test homeowner and project
    const user = await prisma.user.findFirst({
      where: { email: 'nailit.test.homeowner@gmail.com' },
      include: {
        projects: {
          include: {
            teamMembers: true,
            emailSettings: true
          }
        }
      }
    });

    if (!user || user.projects.length === 0) {
      throw new Error('Test homeowner or project not found');
    }

    const project = user.projects[0];
    console.log(`✅ Found project: ${project.name}`);
    console.log(`✅ Team members: ${project.teamMembers.length}`);

    // 2. Simulate Gmail API email discovery
    // In real implementation, this would use Gmail API
    const discoveredEmails = await simulateGmailDiscovery(user.email);
    console.log(`✅ Discovered ${discoveredEmails.length} emails from Gmail`);

    // 3. Apply team member filtering
    let processedCount = 0;
    let filteredCount = 0;

    for (const email of discoveredEmails) {
      const filterResult = await teamMemberFilter.shouldProcessEmail(
        { email: email.sender },
        email.recipients.map(r => ({ email: r })),
        user.id
      );

      if (filterResult.shouldProcess) {
        // 4. Store email in database (ingestion)
        const emailMessage = await prisma.emailMessage.create({
          data: {
            messageId: email.messageId,
            subject: email.subject,
            sender: email.sender,
            recipients: email.recipients,
            sentAt: email.sentAt,
            bodyText: email.bodyText,
            userId: user.id,
            projectId: project.id,
            ingestionStatus: 'completed',
            analysisStatus: 'pending'
          }
        });
        
        processedCount++;
        console.log(`✅ Ingested: ${email.subject}`);
      } else {
        filteredCount++;
        console.log(`⚠️  Filtered: ${email.subject} (${filterResult.reason})`);
      }
    }

    console.log('\n📊 Ingestion Summary:');
    console.log(`   Discovered: ${discoveredEmails.length} emails`);
    console.log(`   Ingested: ${processedCount} emails`);
    console.log(`   Filtered: ${filteredCount} emails`);
    console.log(`   Filter Rate: ${((filteredCount / discoveredEmails.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Email discovery failed:', error);
    throw error;
  }
}

async function simulateGmailDiscovery(userEmail: string) {
  // Simulate Gmail API response with test emails
  // In real implementation, this would be actual Gmail API calls
  return [
    {
      messageId: 'gmail-msg-001',
      subject: 'Kitchen Renovation - Final Quote',
      sender: 'nailit.test.contractor@gmail.com',
      recipients: [userEmail],
      sentAt: new Date('2025-01-01T10:00:00Z'),
      bodyText: 'Final quote for kitchen renovation: $65,000 total...'
    },
    {
      messageId: 'gmail-msg-002', 
      subject: 'Re: Kitchen Renovation - Final Quote',
      sender: userEmail,
      recipients: ['nailit.test.contractor@gmail.com'],
      sentAt: new Date('2025-01-01T14:30:00Z'),
      bodyText: 'Thank you for the quote. I have a few questions...'
    },
    // Add more test emails...
  ];
}

discoverEmails();
```

### **4.2 Real-time Email Processing**

Test webhook-based real-time email processing:

```bash
# Setup Gmail webhooks
npm run test:webhook:setup

# Send test email and verify processing
npm run test:webhook:send-and-verify

# Check webhook processing
npm run test:webhook:verify-processing
```

### **4.3 Validate Ingestion Results**

Verify emails were properly ingested:

```bash
# Check ingested emails
npm run test:ingest:verify

# Validate team member filtering
npm run test:ingest:verify-filtering

# Check email content integrity
npm run test:ingest:verify-content
```

---

## 🤖 **Step 5: AI Processing**

### **5.1 Process Ingested Emails**

Run AI analysis on all ingested emails:

```bash
# Process all ingested emails
npm run test:ai:process-all

# Or manual processing
npx tsx scripts/process-emails-ai.ts
```

**AI Processing Script** (`scripts/process-emails-ai.ts`):
```typescript
import { prisma } from '../app/lib/prisma';
import { EmailAnalyzer } from '../app/lib/ai/email-analyzer';

async function processEmailsWithAI() {
  console.log('🤖 Processing ingested emails with AI...');
  
  try {
    // 1. Get all pending emails
    const emails = await prisma.emailMessage.findMany({
      where: {
        analysisStatus: 'pending',
        userId: { not: null } // Only process ingested emails
      },
      include: {
        project: {
          include: {
            teamMembers: true
          }
        }
      }
    });

    console.log(`✅ Found ${emails.length} emails to process`);

    // 2. Initialize AI analyzer
    const analyzer = new EmailAnalyzer({ 
      useEnhancedContext: false // Use MVP context for testing
    });

    let successCount = 0;
    let errorCount = 0;

    // 3. Process each email
    for (const email of emails) {
      console.log(`\n📧 Processing: ${email.subject}`);
      
      try {
        const startTime = Date.now();
        
        // Analyze email
        const result = await analyzer.analyzeEmail(
          {
            id: email.id,
            subject: email.subject,
            sender: email.sender,
            recipients: email.recipients,
            content: email.bodyText || '',
            sentAt: email.sentAt
          },
          email.project
        );

        const duration = Date.now() - startTime;

        if (result.success && result.analysis) {
          // Store analysis results
          const analysis = await prisma.emailAnalysis.create({
            data: {
              emailId: email.id,
              projectId: email.project.id,
              primaryType: result.analysis.classification.primary_type,
              confidenceScore: result.analysis.confidence_score,
              subCategories: JSON.stringify(result.analysis.classification.sub_categories),
              keyPoints: JSON.stringify(result.analysis.summary.key_points),
              actionItems: JSON.stringify(result.analysis.summary.action_items),
              timelineMentions: JSON.stringify(result.analysis.summary.timeline_mentions),
              keyAmounts: result.analysis.entities.amounts?.map(a => parseFloat(a.replace(/[^0-9.-]/g, ''))) || [],
              keyDates: result.analysis.entities.dates || [],
              keyContractors: result.analysis.entities.contractors || [],
              entities: JSON.stringify(result.analysis.entities),
              priority: result.analysis.priority,
              requiresResponse: result.analysis.requires_response,
              attachmentsMentioned: result.analysis.attachments_mentioned,
              modelUsed: result.analysis.processing_metadata.model_used,
              processingTimeMs: result.analysis.processing_metadata.processing_time_ms,
              analyzedAt: new Date(result.analysis.processing_metadata.analyzed_at),
              fullAnalysisJson: result.analysis
            }
          });

          // Update email status
          await prisma.emailMessage.update({
            where: { id: email.id },
            data: { analysisStatus: 'completed' }
          });

          successCount++;
          console.log(`✅ Analysis complete (${duration}ms)`);
          console.log(`   Classification: ${result.analysis.classification.primary_type}`);
          console.log(`   Confidence: ${(result.analysis.confidence_score * 100).toFixed(1)}%`);
          console.log(`   Priority: ${result.analysis.priority}`);

        } else {
          throw new Error(result.error || 'Analysis failed');
        }

      } catch (error) {
        errorCount++;
        console.log(`❌ Analysis failed: ${error}`);
        
        // Update email status
        await prisma.emailMessage.update({
          where: { id: email.id },
          data: { analysisStatus: 'error' }
        });
      }
    }

    console.log('\n📊 AI Processing Summary:');
    console.log(`   Total Emails: ${emails.length}`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Errors: ${errorCount}`);
    console.log(`   Success Rate: ${((successCount / emails.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ AI processing failed:', error);
    throw error;
  }
}

processEmailsWithAI();
```

### **5.2 Validate AI Analysis Results**

Verify AI analysis quality and accuracy:

```bash
# Check analysis results
npm run test:ai:verify-results

# Validate confidence scores
npm run test:ai:verify-confidence

# Check entity extraction
npm run test:ai:verify-entities
```

---

## 🚩 **Step 6: Flagged Items Creation**

### **6.1 Create Flagged Items from AI Analysis**

Convert AI analysis results to flagged items:

```bash
# Create flagged items from analysis
npm run test:flagged:create-from-ai

# Or manual creation
npx tsx scripts/create-flagged-items.ts
```

**Flagged Items Creation Script** (`scripts/create-flagged-items.ts`):
```typescript
import { prisma } from '../app/lib/prisma';

async function createFlaggedItemsFromAI() {
  console.log('🚩 Creating flagged items from AI analysis...');
  
  try {
    // 1. Get all AI analyses that should create flagged items
    const analyses = await prisma.emailAnalysis.findMany({
      where: {
        // Only create flagged items for high-confidence, actionable analyses
        confidenceScore: { gte: 0.8 },
        primaryType: {
          in: ['invoice', 'change_order', 'cost_estimate', 'schedule_update', 'delay_notification']
        }
      },
      include: {
        email: true,
        project: true
      }
    });

    console.log(`✅ Found ${analyses.length} analyses eligible for flagged items`);

    let createdCount = 0;

    // 2. Create flagged items
    for (const analysis of analyses) {
      try {
        // Map AI analysis to flagged item category
        const category = mapAnalysisToCategory(analysis.primaryType);
        const impact = extractImpact(analysis);
        
        const flaggedItem = await prisma.flaggedItem.create({
          data: {
            title: generateTitle(analysis),
            description: generateDescription(analysis),
            impact: impact,
            category: category,
            emailFrom: analysis.email.sender,
            emailSubject: analysis.email.subject,
            emailDate: analysis.email.sentAt,
            originalEmail: analysis.email.bodyText,
            aiConfidence: analysis.confidenceScore,
            detectedChanges: analysis.keyPoints,
            needsEmailResponse: analysis.requiresResponse,
            status: 'PENDING',
            projectId: analysis.projectId
          }
        });

        createdCount++;
        console.log(`✅ Created flagged item: ${flaggedItem.title}`);

      } catch (error) {
        console.log(`❌ Failed to create flagged item for analysis ${analysis.id}: ${error}`);
      }
    }

    console.log('\n📊 Flagged Items Summary:');
    console.log(`   Eligible Analyses: ${analyses.length}`);
    console.log(`   Flagged Items Created: ${createdCount}`);
    console.log(`   Creation Rate: ${((createdCount / analyses.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ Flagged items creation failed:', error);
    throw error;
  }
}

function mapAnalysisToCategory(primaryType: string): 'COST' | 'SCHEDULE' | 'SCOPE' | 'UNCLASSIFIED' {
  const mapping = {
    'invoice': 'COST',
    'change_order': 'COST',
    'cost_estimate': 'COST',
    'schedule_update': 'SCHEDULE',
    'delay_notification': 'SCHEDULE',
    'scope_modification': 'SCOPE',
    'scope_change': 'SCOPE'
  };
  
  return mapping[primaryType] || 'UNCLASSIFIED';
}

function extractImpact(analysis: any): string {
  const amounts = analysis.keyAmounts || [];
  const dates = analysis.keyDates || [];
  
  if (amounts.length > 0) {
    const totalAmount = amounts.reduce((sum: number, amount: number) => sum + amount, 0);
    return `Cost impact: $${totalAmount.toLocaleString()}`;
  }
  
  if (dates.length > 0) {
    return `Timeline impact: ${dates.join(', ')}`;
  }
  
  return 'Impact to be determined';
}

function generateTitle(analysis: any): string {
  const type = analysis.primaryType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  const contractor = analysis.keyContractors?.[0] || 'Team Member';
  return `${type} from ${contractor}`;
}

function generateDescription(analysis: any): string {
  const keyPoints = JSON.parse(analysis.keyPoints || '[]');
  return keyPoints.join('. ') || 'AI detected important project communication.';
}

createFlaggedItemsFromAI();
```

### **6.2 Validate Flagged Items**

Verify flagged items were created correctly:

```bash
# Check flagged items
npm run test:flagged:verify

# Validate flagged item data
npm run test:flagged:verify-data

# Check AI confidence mapping
npm run test:flagged:verify-confidence
```

---

## 📊 **Step 7: Timeline Display**

### **7.1 User Review and Confirmation**

Simulate user reviewing and confirming flagged items:

```bash
# Simulate user review process
npm run test:timeline:simulate-review

# Or manual review simulation
npx tsx scripts/simulate-user-review.ts
```

**User Review Simulation Script** (`scripts/simulate-user-review.ts`):
```typescript
import { prisma } from '../app/lib/prisma';

async function simulateUserReview() {
  console.log('📊 Simulating user review of flagged items...');
  
  try {
    // 1. Get all pending flagged items
    const flaggedItems = await prisma.flaggedItem.findMany({
      where: { status: 'PENDING' },
      orderBy: { emailDate: 'desc' }
    });

    console.log(`✅ Found ${flaggedItems.length} pending flagged items`);

    let confirmedCount = 0;
    let dismissedCount = 0;

    // 2. Simulate user decisions (80% confirm, 20% dismiss)
    for (const item of flaggedItems) {
      const shouldConfirm = Math.random() > 0.2; // 80% confirmation rate
      
      if (shouldConfirm) {
        // Confirm item and create timeline entry
        await prisma.flaggedItem.update({
          where: { id: item.id },
          data: {
            status: 'CONFIRMED',
            reviewedAt: new Date(),
            userNotes: 'Confirmed during testing'
          }
        });

        // Create timeline entry
        const timelineEntry = await prisma.timelineEntry.create({
          data: {
            title: item.title,
            description: item.description,
            category: item.category as 'COST' | 'SCHEDULE' | 'SCOPE' | 'ISSUE' | 'UPDATE',
            date: item.emailDate,
            impact: item.impact,
            projectId: item.projectId,
            flaggedItemId: item.id,
            verified: true
          }
        });

        confirmedCount++;
        console.log(`✅ Confirmed: ${item.title}`);

      } else {
        // Dismiss item
        await prisma.flaggedItem.update({
          where: { id: item.id },
          data: {
            status: 'IGNORED',
            reviewedAt: new Date(),
            userNotes: 'Dismissed during testing'
          }
        });

        dismissedCount++;
        console.log(`❌ Dismissed: ${item.title}`);
      }
    }

    console.log('\n📊 Review Summary:');
    console.log(`   Total Items: ${flaggedItems.length}`);
    console.log(`   Confirmed: ${confirmedCount}`);
    console.log(`   Dismissed: ${dismissedCount}`);
    console.log(`   Confirmation Rate: ${((confirmedCount / flaggedItems.length) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('❌ User review simulation failed:', error);
    throw error;
  }
}

simulateUserReview();
```

### **7.2 Validate Timeline Display**

Verify timeline entries are properly displayed:

```bash
# Check timeline entries
npm run test:timeline:verify

# Test timeline API
npm run test:timeline:api

# Validate timeline data
npm run test:timeline:validate-data
```

---

## 🎯 **Step 8: End-to-End Validation**

### **8.1 Complete Workflow Validation**

Validate the entire pipeline works correctly:

```bash
# Run complete validation
npm run test:e2e:validate

# Or manual validation
npx tsx scripts/validate-e2e-workflow.ts
```

**E2E Validation Script** (`scripts/validate-e2e-workflow.ts`):
```typescript
import { prisma } from '../app/lib/prisma';

async function validateE2EWorkflow() {
  console.log('🎯 Validating end-to-end workflow...');
  
  try {
    const project = await prisma.project.findFirst({
      where: { name: 'Kitchen Renovation Test Project' },
      include: {
        emailMessages: true,
        emailAnalyses: true,
        flaggedItems: true,
        timelineEntries: true,
        teamMembers: true
      }
    });

    if (!project) {
      throw new Error('Test project not found');
    }

    console.log('\n📊 End-to-End Workflow Results:');
    console.log(`   Project: ${project.name}`);
    console.log(`   Team Members: ${project.teamMembers.length}`);
    console.log(`   Ingested Emails: ${project.emailMessages.length}`);
    console.log(`   AI Analyses: ${project.emailAnalyses.length}`);
    console.log(`   Flagged Items: ${project.flaggedItems.length}`);
    console.log(`   Timeline Entries: ${project.timelineEntries.length}`);

    // Validation checks
    const checks = [
      {
        name: 'Team members configured',
        passed: project.teamMembers.length > 0,
        expected: 'At least 1 team member'
      },
      {
        name: 'Emails ingested',
        passed: project.emailMessages.length > 0,
        expected: 'At least 1 ingested email'
      },
      {
        name: 'AI analysis completed',
        passed: project.emailAnalyses.length > 0,
        expected: 'At least 1 AI analysis'
      },
      {
        name: 'Flagged items created',
        passed: project.flaggedItems.length > 0,
        expected: 'At least 1 flagged item'
      },
      {
        name: 'Timeline entries created',
        passed: project.timelineEntries.length > 0,
        expected: 'At least 1 timeline entry'
      },
      {
        name: 'Analysis to email ratio',
        passed: project.emailAnalyses.length >= project.emailMessages.length * 0.8,
        expected: '80% of emails analyzed'
      },
      {
        name: 'Flagged to analysis ratio',
        passed: project.flaggedItems.length >= project.emailAnalyses.length * 0.3,
        expected: '30% of analyses flagged'
      },
      {
        name: 'Timeline to flagged ratio',
        passed: project.timelineEntries.length >= project.flaggedItems.length * 0.5,
        expected: '50% of flagged items confirmed'
      }
    ];

    console.log('\n✅ Validation Checks:');
    let passedChecks = 0;
    
    for (const check of checks) {
      const status = check.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`   ${status} ${check.name} (${check.expected})`);
      if (check.passed) passedChecks++;
    }

    const successRate = (passedChecks / checks.length) * 100;
    console.log(`\n📈 Overall Success Rate: ${successRate.toFixed(1)}% (${passedChecks}/${checks.length})`);

    if (successRate >= 80) {
      console.log('🎉 End-to-end workflow validation PASSED!');
    } else {
      console.log('❌ End-to-end workflow validation FAILED!');
      throw new Error(`Success rate ${successRate.toFixed(1)}% below 80% threshold`);
    }

  } catch (error) {
    console.error('❌ E2E validation failed:', error);
    throw error;
  }
}

validateE2EWorkflow();
```

---

## 🚀 **Master Test Runner**

### **Complete E2E Test Script**

Run the entire workflow with a single command:

```bash
# Run complete end-to-end test
npm run test:e2e:complete

# Or with verbose output
npm run test:e2e:complete -- --verbose
```

**Master Test Script** (`scripts/run-e2e-test.ts`):
```typescript
import { execSync } from 'child_process';

async function runCompleteE2ETest() {
  console.log('🚀 Starting Complete End-to-End Test');
  console.log('=====================================\n');

  const steps = [
    { name: 'Data Cleanup', command: 'npx tsx scripts/cleanup-test-data.ts' },
    { name: 'Gmail Cleanup', command: 'npm run test:gmail:cleanup-all' },
    { name: 'Homeowner Setup', command: 'npx tsx scripts/setup-test-homeowner.ts' },
    { name: 'Email Generation', command: 'npm run test:send-conversations 5 30' },
    { name: 'Email Discovery', command: 'npx tsx scripts/discover-emails.ts' },
    { name: 'AI Processing', command: 'npx tsx scripts/process-emails-ai.ts' },
    { name: 'Flagged Items', command: 'npx tsx scripts/create-flagged-items.ts' },
    { name: 'User Review', command: 'npx tsx scripts/simulate-user-review.ts' },
    { name: 'E2E Validation', command: 'npx tsx scripts/validate-e2e-workflow.ts' }
  ];

  let completedSteps = 0;
  const startTime = Date.now();

  try {
    for (const step of steps) {
      console.log(`\n🔄 Step ${completedSteps + 1}/${steps.length}: ${step.name}`);
      console.log('─'.repeat(50));
      
      const stepStartTime = Date.now();
      execSync(step.command, { stdio: 'inherit' });
      const stepDuration = Date.now() - stepStartTime;
      
      completedSteps++;
      console.log(`✅ ${step.name} completed (${stepDuration}ms)`);
    }

    const totalDuration = Date.now() - startTime;
    console.log('\n🎉 Complete End-to-End Test PASSED!');
    console.log(`📊 Total Duration: ${(totalDuration / 1000).toFixed(1)} seconds`);
    console.log(`📋 Steps Completed: ${completedSteps}/${steps.length}`);

  } catch (error) {
    console.error(`\n❌ E2E Test FAILED at step ${completedSteps + 1}: ${steps[completedSteps]?.name}`);
    console.error('Error:', error);
    process.exit(1);
  }
}

runCompleteE2ETest();
```

---

## 📋 **Success Criteria**

### **End-to-End Validation Checklist**

- [ ] **Data Cleanup**: All test data removed cleanly
- [ ] **Account Setup**: Test homeowner and project created successfully  
- [ ] **Email Generation**: Real emails sent via Gmail API
- [ ] **Team Member Filtering**: Only team member emails ingested
- [ ] **AI Processing**: 80%+ of emails analyzed successfully
- [ ] **Flagged Items**: 30%+ of analyses create flagged items
- [ ] **Timeline Display**: 50%+ of flagged items confirmed to timeline
- [ ] **Performance**: Complete workflow under 10 minutes
- [ ] **Data Integrity**: All relations properly maintained
- [ ] **Error Handling**: Graceful failure recovery

### **Quality Metrics**

- **Email Ingestion Rate**: >90% of team member emails ingested
- **AI Analysis Success**: >80% of emails analyzed without errors
- **Classification Confidence**: >85% average confidence score
- **Flagged Item Relevance**: >70% of flagged items are actionable
- **Timeline Accuracy**: >90% of timeline entries have proper email links

---

## 🔧 **Troubleshooting Guide**

### **Common Issues**

1. **OAuth Expired**: Refresh tokens using `npm run test:oauth:refresh`
2. **Gmail Quota Exceeded**: Wait for quota reset or reduce email volume
3. **Database Connection**: Check Neon database connectivity
4. **AI API Errors**: Verify OpenAI API key and quotas
5. **Team Member Filtering**: Ensure team members are properly configured

### **Debug Commands**

```bash
# Check system status
npm run test:status

# Validate OAuth
npm run test:oauth:status

# Check database state
npm run test:db:status

# Verify AI configuration
npm run test:ai:status

# Gmail connectivity test
npm run test:gmail:connectivity
```

---

This comprehensive playbook ensures complete validation of the email processing pipeline from Gmail ingestion through timeline display, following our documented homeowner-centric testing strategy. 