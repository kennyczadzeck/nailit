#!/usr/bin/env ts-node

import { EmailTestOAuth } from './oauth-setup';
import { EmailSender } from './email-sender';
import { EmailTestDataManager } from './data-manager';
import { WebhookTester } from './webhook-tester';

/**
 * Master Email Testing Script
 * 
 * Runs complete email ingestion testing workflow:
 * 1. Reset test data
 * 2. Set up OAuth (if needed)
 * 3. Generate test emails
 * 4. Test historical ingestion
 * 5. Test real-time webhook ingestion
 * 6. Validate storage (PostgreSQL + S3)
 */

class MasterEmailTester {
  private oauth: EmailTestOAuth;
  private sender: EmailSender;
  private dataManager: EmailTestDataManager;
  private webhookTester: WebhookTester;

  constructor() {
    this.oauth = new EmailTestOAuth();
    this.sender = new EmailSender();
    this.dataManager = new EmailTestDataManager();
    this.webhookTester = new WebhookTester();
  }

  /**
   * Run complete email testing workflow
   */
  async runCompleteTest(): Promise<void> {
    console.log(`\n🚀 Starting Complete Email Testing Workflow\n`);

    try {
      // Step 1: Reset environment
      console.log(`\n📋 Step 1: Reset Environment`);
      await this.dataManager.truncateAll();

      // Step 2: Verify OAuth credentials
      console.log(`\n📋 Step 2: Verify OAuth Credentials`);
      await this.verifyOAuth();

      // Step 3: Generate historical test data
      console.log(`\n📋 Step 3: Generate Historical Test Data`);
      await this.sender.sendBulkEmails(10, 30);

      // Step 4: Test real-time webhook
      console.log(`\n📋 Step 4: Test Real-time Webhook`);
      await this.webhookTester.setupWebhook();
      await this.webhookTester.testWebhook(30);

      // Step 5: Validate storage
      console.log(`\n📋 Step 5: Validate Storage`);
      await this.validateStorage();

      console.log(`\n✅ Complete Email Testing Workflow Successful!`);

    } catch (error: any) {
      console.error(`\n❌ Complete Email Testing Workflow Failed:`, error.message);
      throw error;
    }
  }

  /**
   * Run quick smoke test
   */
  async runSmokeTest(): Promise<void> {
    console.log(`\n💨 Starting Email Smoke Test\n`);

    try {
      // Quick OAuth check
      console.log(`📋 Checking OAuth...`);
      const contractorValid = await this.oauth.testCredentials('contractor');
      const homeownerValid = await this.oauth.testCredentials('homeowner');

      if (!contractorValid || !homeownerValid) {
        throw new Error('OAuth credentials not valid. Run setup first.');
      }

      // Send single test email
      console.log(`📋 Sending test email...`);
      await this.sender.sendTestEmail('urgent-issue');

      // Quick data check
      console.log(`📋 Checking data...`);
      await this.dataManager.queryEmails(5);

      console.log(`\n✅ Email Smoke Test Successful!`);

    } catch (error: any) {
      console.error(`\n❌ Email Smoke Test Failed:`, error.message);
      throw error;
    }
  }

  /**
   * Set up OAuth for both test accounts
   */
  async setupOAuth(): Promise<void> {
    console.log(`\n🔐 Setting up OAuth for test accounts\n`);

    console.log(`\n1️⃣  Setting up contractor account OAuth:`);
    await this.oauth.setupAccount('contractor');

    console.log(`\n2️⃣  Setting up homeowner account OAuth:`);
    await this.oauth.setupAccount('homeowner');

    console.log(`\n📋 OAuth setup instructions displayed above.`);
    console.log(`📋 Complete the OAuth flows, then run the test again.`);
  }

  /**
   * Verify OAuth credentials are working
   */
  private async verifyOAuth(): Promise<void> {
    const contractorValid = await this.oauth.testCredentials('contractor');
    const homeownerValid = await this.oauth.testCredentials('homeowner');

    if (!contractorValid || !homeownerValid) {
      console.log(`❌ OAuth credentials invalid. Run setup first:`);
      console.log(`   npm run test:oauth-setup contractor`);
      console.log(`   npm run test:oauth-setup homeowner`);
      throw new Error('OAuth setup required');
    }

    console.log(`✅ OAuth credentials validated`);
  }

  /**
   * Validate storage in PostgreSQL and S3
   */
  private async validateStorage(): Promise<void> {
    console.log(`🗄️  Validating PostgreSQL storage...`);
    await this.dataManager.queryEmails(15);

    console.log(`\n📦 Validating S3 storage...`);
    await this.dataManager.checkS3();

    console.log(`✅ Storage validation complete`);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`\n🧪 Master Email Testing Utility\n`);
    console.log(`Usage:`);
    console.log(`  npm run test:email-complete      # Full testing workflow`);
    console.log(`  npm run test:email-smoke         # Quick smoke test`);
    console.log(`  npm run test:email-setup         # OAuth setup for both accounts`);
    console.log(`\nWorkflow Steps:`);
    console.log(`  1. Reset test data (PostgreSQL + S3)`);
    console.log(`  2. Verify OAuth credentials`);
    console.log(`  3. Generate historical test emails`);
    console.log(`  4. Test real-time webhook ingestion`);
    console.log(`  5. Validate storage systems`);
    console.log(`\nPrerequisites:`);
    console.log(`  - Gmail API credentials in .env.local`);
    console.log(`  - OAuth setup completed for test accounts`);
    console.log(`  - AWS credentials configured`);
    console.log(`  - Database connection working`);
    return;
  }

  const tester = new MasterEmailTester();

  try {
    switch (command) {
      case 'complete':
        await tester.runCompleteTest();
        break;

      case 'smoke':
        await tester.runSmokeTest();
        break;

      case 'setup':
        await tester.setupOAuth();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error: any) {
    console.error(`❌ Error:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { MasterEmailTester };
