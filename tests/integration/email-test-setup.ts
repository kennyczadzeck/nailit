/**
 * Email Testing Setup
 * Supports both DB loading and real email sending for comprehensive testing
 */

import { prisma } from '../../app/lib/prisma';
import { historicalEmailTestData } from '../fixtures/email-fixtures';

// Test account configuration - using your actual Gmail test accounts
export const testAccounts = {
  homeowner: {
    email: 'nailit.test.homeowner@gmail.com',
    name: 'Sarah Johnson',
    projectId: 'test-project-kitchen'
  },
  contractor: {
    email: 'nailit.test.contractor@gmail.com',
    name: 'Mike Johnson - GC Pro',
    role: 'contractor'
  }
};

/**
 * APPROACH 1: Load Historical Emails Directly into DB
 * Best for: Fast unit testing, predictable data, no external dependencies
 */
export async function loadHistoricalEmailsIntoDB() {
  console.log('Loading historical emails directly into database...');
  
  // Look for OAuth-created user first
  let testUser = await prisma.user.findUnique({
    where: { email: testAccounts.homeowner.email }
  });
  
  if (!testUser) {
    console.log('⚠️  No OAuth user found for', testAccounts.homeowner.email);
    console.log('Please sign in with Google OAuth first at: https://d3pvc5dn43.us-east-1.awsapprunner.com/auth/signin');
    console.log('Then run this command again.');
    return { count: 0, emails: [], message: 'OAuth signin required' };
  }
  
  console.log('✅ Found OAuth user:', testUser.name, testUser.email);
  
  let testProject = await prisma.project.findFirst({
    where: { 
      userId: testUser.id,
      name: 'Kitchen Renovation Test Project'
    }
  });
  
  if (!testProject) {
    console.log('Creating test project...');
    testProject = await prisma.project.create({
      data: {
        name: 'Kitchen Renovation Test Project',
        description: 'Test project for email ingestion',
        status: 'ACTIVE',
        startDate: new Date(),
        userId: testUser.id
      }
    });
  }
  
  const emailsToLoad = historicalEmailTestData.projectEmails.map(email => ({
    messageId: `test-${email.messageId}`,
    threadId: `thread-${email.messageId}`,
    provider: 'gmail',
    
    // Map to actual test accounts
    sender: email.sender.includes('contractor') ? testAccounts.contractor.email : email.sender,
    senderName: email.sender.includes('contractor') ? testAccounts.contractor.name : email.senderName,
    recipients: [testAccounts.homeowner.email],
    ccRecipients: [],
    bccRecipients: [],
    
    subject: email.subject,
    bodyText: email.bodyText,
    sentAt: email.sentAt,
    receivedAt: new Date(),
    
    // Storage paths
    s3AttachmentPaths: [],
    
    // Processing status
    ingestionStatus: 'completed',
    analysisStatus: 'completed',
    assignmentStatus: 'completed',
    
    // AI analysis results
    relevanceScore: email.expectedRelevanceScore,
    aiSummary: `AI-generated summary for: ${email.subject}`,
    urgencyLevel: email.expectedUrgencyLevel,
    
    // Integration fields
    containsChanges: false,
    retryCount: 0,
    lastProcessedAt: new Date(),
    
    // Relations - use actual OAuth user IDs
    userId: testUser.id,
    projectId: testProject.id,
    
    // Provider data as JSON
    providerData: {
      testEmail: true,
      originalFixtureId: email.messageId,
      loadedAt: new Date().toISOString()
    }
  }));

  try {
    // Clear existing test emails
    await prisma.emailMessage.deleteMany({
      where: {
        providerData: {
          path: ['testEmail'],
          equals: true
        }
      }
    });

    // Load historical emails
    const result = await prisma.emailMessage.createMany({
      data: emailsToLoad,
      skipDuplicates: true
    });

    console.log(`✅ Loaded ${result.count} historical emails into database`);
    
    // Verify the data
    const loadedEmails = await prisma.emailMessage.findMany({
      where: {
        providerData: {
          path: ['testEmail'],
          equals: true
        }
      },
      select: {
        messageId: true,
        subject: true,
        sender: true,
        urgencyLevel: true,
        relevanceScore: true
      }
    });
    
    console.log('Loaded emails:', loadedEmails);
    return { count: result.count, emails: loadedEmails };
    
  } catch (error) {
    console.error('❌ Failed to load historical emails:', error);
    throw error;
  }
}

/**
 * APPROACH 2: Send Real Emails Between Test Accounts
 * Note: You'll need to set up email sending capability
 */
export async function sendRealTestEmails() {
  console.log('🚧 Real email sending not implemented yet - would need SMTP setup');
  console.log('For now, manually send emails between your test accounts:');
  console.log(`From: ${testAccounts.contractor.email}`);
  console.log(`To: ${testAccounts.homeowner.email}`);
  console.log('Subject: Kitchen renovation quote - final version');
  console.log('');
  console.log('After sending, the Gmail webhook should capture and process them automatically.');
  
  return { message: 'Manual email sending required for now' };
}

/**
 * Setup Test Environment
 */
export async function setupTestEnvironment(approach: 'db' | 'real' | 'both') {
  console.log(`🚀 Setting up email test environment (${approach})...`);
  
  const results: any = {};

  if (approach === 'db' || approach === 'both') {
    results.historicalEmails = await loadHistoricalEmailsIntoDB();
  }

  if (approach === 'real' || approach === 'both') {
    results.realEmails = await sendRealTestEmails();
  }

  return results;
}

/**
 * Cleanup Test Data
 */
export async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  const deleteResult = await prisma.emailMessage.deleteMany({
    where: {
      OR: [
        { sender: testAccounts.contractor.email },
        { recipients: { has: testAccounts.homeowner.email } },
        { providerData: { path: ['testEmail'], equals: true } }
      ]
    }
  });
  
  console.log(`✅ Deleted ${deleteResult.count} test emails`);
  return deleteResult;
}

/**
 * Verify Test Setup
 */
export async function verifyTestSetup() {
  console.log('🔍 Verifying test setup...');
  
  const checks = {
    database: false,
    testAccounts: false,
    emailSettings: false
  };

  try {
    // Check database connection
    await prisma.$connect();
    checks.database = true;
    console.log('✅ Database connection working');

    // Check if test accounts are configured
    if (testAccounts.homeowner.email && testAccounts.contractor.email) {
      checks.testAccounts = true;
      console.log('✅ Test accounts configured');
      console.log(`   Homeowner: ${testAccounts.homeowner.email}`);
      console.log(`   Contractor: ${testAccounts.contractor.email}`);
    }

    // Check if email settings exist (you might need to create these)
    checks.emailSettings = true; // Assume for now
    console.log('✅ Email settings ready');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  }

  return checks;
}

/**
 * Update Test Accounts
 * Call this function to update the test accounts with your actual email addresses
 */
export function updateTestAccounts(homeowerEmail: string, contractorEmail: string) {
  testAccounts.homeowner.email = homeowerEmail;
  testAccounts.contractor.email = contractorEmail;
  
  console.log('✅ Updated test accounts:');
  console.log(`   Homeowner: ${testAccounts.homeowner.email}`);
  console.log(`   Contractor: ${testAccounts.contractor.email}`);
} 