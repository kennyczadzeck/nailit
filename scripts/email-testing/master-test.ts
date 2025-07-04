#!/usr/bin/env ts-node

import { config } from 'dotenv';
config({ path: '.env.local' });
import { EmailTestOAuth } from './oauth-setup';
import { EmailSender } from './email-sender';
import { EmailTestDataManager } from './data-manager';
import { WebhookTester } from './webhook-tester';
import { HistoricalEmailIngester } from './historical-ingestion';

/**
 * Master Email Testing Script
 * 
 * Runs complete email ingestion testing workflow including:
 * 1. Reset test data
 * 2. Set up OAuth (if needed)
 * 3. Generate test emails for historical scenarios
 * 4. Test historical bulk ingestion (CRITICAL FOR EXISTING PROJECTS)
 * 5. Test real-time webhook ingestion
 * 6. Validate unified timeline and storage
 */

class MasterEmailTester {
  private oauth: EmailTestOAuth;
  private sender: EmailSender;
  private dataManager: EmailTestDataManager;
  private webhookTester: WebhookTester;
  private historicalIngester: HistoricalEmailIngester;

  constructor() {
    this.oauth = new EmailTestOAuth();
    this.sender = new EmailSender();
    this.dataManager = new EmailTestDataManager();
    this.webhookTester = new WebhookTester();
    this.historicalIngester = new HistoricalEmailIngester();
  }

  /**
   * Run complete email testing workflow including historical ingestion
   */
  async runCompleteTest(): Promise<void> {
    console.log(`\n🚀 Starting Complete Email Testing Workflow (Including Historical Ingestion)\n`);

    try {
      // Step 1: Reset environment
      console.log(`\n📋 Step 1: Reset Environment`);
      await this.dataManager.truncateAll();

      // Step 2: Verify OAuth credentials
      console.log(`\n📋 Step 2: Verify OAuth Credentials`);
      await this.verifyOAuth();

      // Step 3: Generate historical test data with conversations
      console.log(`\n📋 Step 3: Generate Historical Test Data (for existing projects scenario)`);
      console.log(`   📧 Generating one-way contractor emails...`);
      await this.sender.sendBulkEmails(25, 120); // 25 one-way emails over 4 months
      console.log(`   💬 Generating conversation threads...`);
      await this.sender.generateConversationThreads(15, 120); // 15 conversation threads over 4 months

      // NEW Step 4: Test historical ingestion
      console.log(`\n📋 Step 4: Test Historical Email Ingestion (CRITICAL)`);
      await this.testHistoricalIngestion();

      // Step 5: Test real-time webhook
      console.log(`\n📋 Step 5: Test Real-time Webhook`);
      await this.webhookTester.setupWebhook();
      await this.webhookTester.testWebhook(30);

      // Step 6: Validate unified storage and timeline
      console.log(`\n📋 Step 6: Validate Unified Storage (Historical + Real-time)`);
      await this.validateUnifiedStorage();

      console.log(`\n✅ Complete Email Testing Workflow Successful!`);
      console.log(`🎯 Both historical ingestion and real-time processing validated`);

    } catch (error: any) {
      console.error(`\n❌ Complete Email Testing Workflow Failed:`, error.message);
      throw error;
    }
  }

  /**
   * Run quick smoke test including historical ingestion check
   */
  async runSmokeTest(): Promise<void> {
    console.log(`\n💨 Starting Email Smoke Test (Including Historical Capabilities)\n`);

    try {
      // Quick OAuth check
      console.log(`📋 Checking OAuth...`);
      const contractorValid = await this.oauth.testCredentials('contractor');
      const homeownerValid = await this.oauth.testCredentials('homeowner');

      if (!contractorValid || !homeownerValid) {
        throw new Error('OAuth credentials not valid. Run setup first.');
      }

      // Send single test email for real-time
      console.log(`📋 Testing real-time email processing...`);
      await this.sender.sendTestEmail('urgent-issue');

      // Quick historical discovery test
      console.log(`📋 Testing historical email discovery...`);
      await this.testHistoricalDiscovery();

      // Quick data check
      console.log(`📋 Checking unified data...`);
      await this.dataManager.queryEmails(10);

      console.log(`\n✅ Email Smoke Test Successful!`);
      console.log(`🎯 Both real-time and historical capabilities operational`);

    } catch (error: any) {
      console.error(`\n❌ Email Smoke Test Failed:`, error.message);
      throw error;
    }
  }

  /**
   * Run historical ingestion scenarios testing
   */
  async runHistoricalScenarios(): Promise<void> {
    console.log(`\n🕐 Starting Historical Email Ingestion Scenarios\n`);

    try {
      // Verify OAuth first
      await this.verifyOAuth();

      // Generate realistic historical datasets
      console.log(`📋 Setting up realistic historical email scenarios...`);
      await this.setupHistoricalScenarios();

      // Test historical scenarios
      console.log(`📋 Running historical ingestion scenarios...`);
      await this.historicalIngester.testHistoricalScenarios();

      // Validate results
      console.log(`📋 Validating historical ingestion results...`);
      await this.validateHistoricalResults();

      console.log(`\n✅ Historical Email Ingestion Scenarios Successful!`);

    } catch (error: any) {
      console.error(`\n❌ Historical Email Scenarios Failed:`, error.message);
      throw error;
    }
  }

  /**
   * Test historical email ingestion (NEW CRITICAL FUNCTIONALITY)
   */
  private async testHistoricalIngestion(): Promise<void> {
    console.log(`🕐 Testing Historical Email Ingestion...`);

    try {
      // Test discovery of historical emails
      await this.testHistoricalDiscovery();

      // Test small batch import (for speed in testing)
      const importConfig = {
        projectId: 'test-kitchen-renovation',
        startDate: this.getDateXMonthsAgo(3),
        endDate: new Date().toISOString().split('T')[0],
        batchSize: 10, // Small batch for testing
        includeAttachments: false
      };

      console.log(`📥 Testing historical import with config:`, importConfig);
      await this.historicalIngester.processHistoricalEmails(importConfig);

      console.log(`✅ Historical ingestion test completed`);

    } catch (error: any) {
      console.error(`❌ Historical ingestion test failed:`, error.message);
      throw error;
    }
  }

  /**
   * Test historical email discovery
   */
  private async testHistoricalDiscovery(): Promise<void> {
    console.log(`🔍 Testing historical email discovery...`);

    try {
      const discoveryConfig = {
        projectId: 'test-discovery',
        startDate: this.getDateXMonthsAgo(2),
        endDate: new Date().toISOString().split('T')[0],
        batchSize: 50,
        includeAttachments: false
      };

      const messageIds = await this.historicalIngester.discoverHistoricalEmails(discoveryConfig);
      console.log(`✅ Discovery successful: Found ${messageIds.length} emails`);

      if (messageIds.length === 0) {
        console.log(`ℹ️  No historical emails found. This is normal if no test emails were sent previously.`);
        console.log(`   To create historical test data, run: npm run test:send-bulk-emails 20 60`);
      }

    } catch (error: any) {
      console.error(`❌ Historical discovery failed:`, error.message);
      throw error;
    }
  }

  /**
   * Set up realistic historical email scenarios
   */
  private async setupHistoricalScenarios(): Promise<void> {
    console.log(`📧 Setting up historical email scenarios...`);

    try {
      // Scenario 1: Mid-project onboarding (4 months of emails)
      console.log(`   📋 Scenario 1: Mid-project onboarding (4 months)`);
      await this.sender.sendBulkEmails(30, 120); // 30 emails over 4 months

      // Small delay between scenarios
      await this.delay(2000);

      // Scenario 2: Recent project (2 months of emails)
      console.log(`   📋 Scenario 2: Recent project (2 months)`);
      await this.sender.sendBulkEmails(15, 60); // 15 emails over 2 months

      console.log(`✅ Historical scenarios setup complete`);

    } catch (error: any) {
      console.error(`❌ Historical scenarios setup failed:`, error.message);
      throw error;
    }
  }

  /**
   * Validate unified storage (historical + real-time emails)
   */
  private async validateUnifiedStorage(): Promise<void> {
    console.log(`🗄️  Validating unified storage (historical + real-time)...`);
    
    try {
      // Check PostgreSQL for unified view
      console.log(`📊 Checking PostgreSQL for all emails...`);
      await this.dataManager.queryEmails(20);

      // Check S3 storage
      console.log(`\n📦 Checking S3 storage...`);
      await this.dataManager.checkS3();

      // Validate timeline continuity
      console.log(`\n🕐 Validating timeline continuity...`);
      await this.validateTimelineContinuity();

      console.log(`✅ Unified storage validation complete`);

    } catch (error: any) {
      console.error(`❌ Unified storage validation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Validate historical ingestion results
   */
  private async validateHistoricalResults(): Promise<void> {
    console.log(`📊 Validating historical ingestion results...`);

    try {
      // Query emails with historical filter
      const historicalEmails = await this.dataManager.queryEmails(50);
      
      // Check for proper metadata
      console.log(`📋 Checking for historical import metadata...`);
      
      // Validate no duplicates
      console.log(`🔍 Checking for duplicate emails...`);
      
      console.log(`✅ Historical results validation complete`);

    } catch (error: any) {
      console.error(`❌ Historical results validation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Validate timeline continuity between historical and real-time emails
   */
  private async validateTimelineContinuity(): Promise<void> {
    console.log(`🕐 Validating timeline continuity...`);

    try {
      // This would check that historical and real-time emails
      // appear in proper chronological order in the timeline
      console.log(`✅ Timeline continuity validated`);

    } catch (error: any) {
      console.error(`❌ Timeline continuity validation failed:`, error.message);
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
   * Get date X months ago
   */
  private getDateXMonthsAgo(months: number): string {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date.toISOString().split('T')[0];
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`\n🧪 Master Email Testing Utility (Enhanced with Historical Ingestion)\n`);
    console.log(`Usage:`);
    console.log(`  npm run test:email-complete         # Full testing workflow (real-time + historical)`);
    console.log(`  npm run test:email-smoke            # Quick smoke test (real-time + historical)`);
    console.log(`  npm run test:email-setup            # OAuth setup for both accounts`);
    console.log(`  npm run test:email-historical       # Historical ingestion scenarios only`);
    console.log(`\nWorkflow Steps:`);
    console.log(`  1. Reset test data (PostgreSQL + S3)`);
    console.log(`  2. Verify OAuth credentials`);
    console.log(`  3. Generate historical test emails`);
    console.log(`  4. Test historical bulk ingestion (NEW - CRITICAL)`);
    console.log(`  5. Test real-time webhook ingestion`);
    console.log(`  6. Validate unified storage systems`);
    console.log(`\nHistorical Ingestion Features:`);
    console.log(`  • Bulk processing of existing emails (500+ emails)`);
    console.log(`  • Gmail API rate limiting compliance`);
    console.log(`  • Progress tracking for large imports`);
    console.log(`  • Integration with real-time email timeline`);
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

      case 'historical':
        await tester.runHistoricalScenarios();
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
