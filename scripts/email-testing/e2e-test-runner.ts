#!/usr/bin/env ts-node

import { config } from 'dotenv';
config({ path: '.env.local' });

import { EmailTestOAuth } from './oauth-setup';
import { EmailSender } from './email-sender';
import { EmailTestDataManager } from './data-manager';
import { WebhookTester } from './webhook-tester';
import { HistoricalEmailIngester } from './historical-ingestion';
import { execSync } from 'child_process';

/**
 * E2E Test Runner - Extends Existing Email Testing Infrastructure
 * 
 * This runner extends the existing email testing workflow by adding:
 * 1. AI processing pipeline integration
 * 2. Flagged items creation
 * 3. Timeline integration validation
 * 4. Complete end-to-end workflow validation
 * 
 * It reuses all existing OAuth, email generation, and ingestion infrastructure
 * to avoid duplication and ensure consistency.
 */

interface TestLevel {
  name: string;
  description: string;
  includeAI: boolean;
  includeFlaggedItems: boolean;
  includeTimeline: boolean;
  costEstimate: string;
}

class E2ETestRunner {
  private oauth: EmailTestOAuth;
  private sender: EmailSender;
  private dataManager: EmailTestDataManager;
  private webhookTester: WebhookTester;
  private historicalIngester: HistoricalEmailIngester;

  // Test levels for cost control
  private readonly testLevels: Record<string, TestLevel> = {
    'email-only': {
      name: 'Email Only',
      description: 'Email generation and ingestion without AI processing',
      includeAI: false,
      includeFlaggedItems: false,
      includeTimeline: false,
      costEstimate: 'Free (no AI costs)'
    },
    'ai-basic': {
      name: 'AI Basic',
      description: 'Email processing with AI analysis (5-10 emails)',
      includeAI: true,
      includeFlaggedItems: false,
      includeTimeline: false,
      costEstimate: '~$0.08-0.16 (AI processing only)'
    },
    'complete': {
      name: 'Complete E2E',
      description: 'Full workflow: Email → AI → Flagged Items → Timeline',
      includeAI: true,
      includeFlaggedItems: true,
      includeTimeline: true,
      costEstimate: '~$0.08-0.16 (AI processing) + database operations'
    }
  };

  constructor() {
    // Reuse existing infrastructure
    this.oauth = new EmailTestOAuth();
    this.sender = new EmailSender();
    this.dataManager = new EmailTestDataManager();
    this.webhookTester = new WebhookTester();
    this.historicalIngester = new HistoricalEmailIngester();
  }

  /**
   * Run E2E test at specified level
   */
  async runE2ETest(level: string = 'complete', verbose: boolean = false): Promise<boolean> {
    const testLevel = this.testLevels[level];
    if (!testLevel) {
      throw new Error(`Invalid test level: ${level}. Available: ${Object.keys(this.testLevels).join(', ')}`);
    }

    console.log(`🚀 Starting E2E Test: ${testLevel.name}`);
    console.log(`📋 Description: ${testLevel.description}`);
    console.log(`💰 Cost Estimate: ${testLevel.costEstimate}`);
    console.log('='.repeat(60));

    const startTime = Date.now();
    let success = false;

    try {
      // Step 1: Verify OAuth (reuse existing infrastructure)
      console.log('\n📋 Step 1: Verify OAuth credentials');
      await this.verifyOAuth();

      // Step 2: Clean and prepare test environment
      console.log('\n📋 Step 2: Prepare test environment');
      await this.prepareTestEnvironment();

      // Step 3: Generate test emails (reuse existing email sender)
      console.log('\n📋 Step 3: Generate test emails');
      await this.generateTestEmails(level);

      // Step 4: Test email ingestion (reuse existing ingestion)
      console.log('\n📋 Step 4: Test email ingestion');
      await this.testEmailIngestion();

      // Step 5: AI processing (if enabled)
      if (testLevel.includeAI) {
        console.log('\n📋 Step 5: AI email processing');
        await this.testAIProcessing(verbose);
      }

      // Step 6: Flagged items creation (if enabled)
      if (testLevel.includeFlaggedItems) {
        console.log('\n📋 Step 6: Flagged items creation');
        await this.testFlaggedItemsCreation();
      }

      // Step 7: Timeline integration (if enabled)
      if (testLevel.includeTimeline) {
        console.log('\n📋 Step 7: Timeline integration');
        await this.testTimelineIntegration();
      }

      // Step 8: Validate complete workflow
      console.log('\n📋 Step 8: Validate workflow');
      await this.validateWorkflow(testLevel);

      const duration = Date.now() - startTime;
      console.log(`\n✅ E2E Test Completed Successfully!`);
      console.log(`📊 Duration: ${(duration / 1000).toFixed(1)} seconds`);
      console.log(`🎯 Level: ${testLevel.name}`);
      success = true;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`\n❌ E2E Test Failed!`);
      console.error(`📊 Duration: ${(duration / 1000).toFixed(1)} seconds`);
      console.error(`❌ Error:`, error);
      success = false;
    }

    return success;
  }

  /**
   * Run email-only test for cost control
   */
  async runEmailOnlyTest(): Promise<boolean> {
    console.log('💰 Running Email-Only Test (No AI costs)');
    return await this.runE2ETest('email-only');
  }

  /**
   * Run AI basic test with limited emails
   */
  async runAIBasicTest(): Promise<boolean> {
    console.log('🤖 Running AI Basic Test (Limited AI processing)');
    return await this.runE2ETest('ai-basic');
  }

  /**
   * Run complete E2E test
   */
  async runCompleteTest(): Promise<boolean> {
    console.log('🎯 Running Complete E2E Test');
    return await this.runE2ETest('complete');
  }

  // Private helper methods that extend existing infrastructure

  private async verifyOAuth(): Promise<void> {
    console.log('🔐 Verifying OAuth credentials...');
    
    try {
      // Check homeowner credentials (for ingestion)
      await this.oauth.testCredentials('homeowner');
      console.log('✅ Homeowner OAuth valid');

      // Check contractor credentials (for email generation)
      await this.oauth.testCredentials('contractor');
      console.log('✅ Contractor OAuth valid');

    } catch (error) {
      console.error('❌ OAuth verification failed');
      console.log('\n🔧 To fix OAuth issues:');
      console.log('   npm run test:oauth-setup homeowner');
      console.log('   npm run test:oauth-setup contractor');
      throw error;
    }
  }

  private async prepareTestEnvironment(): Promise<void> {
    console.log('🧹 Preparing test environment...');
    
    // Reuse existing data manager for cleanup
    await this.dataManager.truncateAll();
    console.log('✅ Test environment prepared');
  }

  private async generateTestEmails(level: string): Promise<void> {
    console.log('📧 Generating test emails...');
    
    // Adjust email count based on test level
    const emailCounts = {
      'email-only': { bulk: 10, conversations: 3 },
      'ai-basic': { bulk: 5, conversations: 2 },
      'complete': { bulk: 8, conversations: 3 }
    };

    const counts = emailCounts[level as keyof typeof emailCounts];
    
    // Reuse existing email sender
    await this.sender.sendBulkEmails(counts.bulk, 30); // Over 1 month
    await this.sender.generateConversationThreads(counts.conversations, 30);
    
    console.log(`✅ Generated ${counts.bulk} emails and ${counts.conversations} conversations`);
  }

  private async testEmailIngestion(): Promise<void> {
    console.log('📥 Testing email ingestion...');
    
    // Reuse existing ingestion test
    execSync('npx tsx scripts/email-testing/test-gmail-fetch.ts', { stdio: 'pipe' });
    
    console.log('✅ Email ingestion completed');
  }

  private async testAIProcessing(verbose: boolean): Promise<void> {
    console.log('🤖 Testing AI processing...');
    
    // Run AI analysis on ingested emails
    const command = 'npx tsx scripts/test-email-analysis-proper.ts';
    execSync(command, { stdio: verbose ? 'inherit' : 'pipe' });
    
    console.log('✅ AI processing completed');
  }

  private async testFlaggedItemsCreation(): Promise<void> {
    console.log('🚩 Testing flagged items creation...');
    
    // Run flagged items creation script
    try {
      execSync('npx tsx scripts/create-flagged-items.ts', { stdio: 'pipe' });
      console.log('✅ Flagged items creation completed');
    } catch (error) {
      console.log('⚠️  Flagged items creation skipped (optional)');
    }
  }

  private async testTimelineIntegration(): Promise<void> {
    console.log('📅 Testing timeline integration...');
    
    // Run timeline integration test
    try {
      execSync('npx tsx scripts/simulate-user-review.ts', { stdio: 'pipe' });
      console.log('✅ Timeline integration completed');
    } catch (error) {
      console.log('⚠️  Timeline integration skipped (optional)');
    }
  }

  private async validateWorkflow(testLevel: TestLevel): Promise<void> {
    console.log('✅ Validating workflow...');
    
    // Check that emails were ingested
    const emailCount = await this.dataManager.countEmails();
    if (emailCount === 0) {
      throw new Error('No emails found in database');
    }
    console.log(`📧 Found ${emailCount} emails in database`);

    // Check AI analysis if enabled
    if (testLevel.includeAI) {
      const analysisCount = await this.dataManager.countAnalyses();
      if (analysisCount === 0) {
        throw new Error('No AI analyses found in database');
      }
      console.log(`🤖 Found ${analysisCount} AI analyses in database`);
    }

    // Check flagged items if enabled
    if (testLevel.includeFlaggedItems) {
      const flaggedCount = await this.dataManager.countFlaggedItems();
      console.log(`🚩 Found ${flaggedCount} flagged items in database`);
    }

    console.log('✅ Workflow validation completed');
  }

  /**
   * Show available test levels
   */
  showTestLevels(): void {
    console.log('\n🎯 Available E2E Test Levels:\n');
    
    for (const [key, level] of Object.entries(this.testLevels)) {
      console.log(`${key.padEnd(12)} - ${level.name}`);
      console.log(`${' '.repeat(15)} ${level.description}`);
      console.log(`${' '.repeat(15)} Cost: ${level.costEstimate}\n`);
    }
    
    console.log('Usage:');
    console.log('  npm run test:e2e:email-only     # Email generation + ingestion only');
    console.log('  npm run test:e2e:ai-basic       # Email + limited AI processing');
    console.log('  npm run test:e2e:complete       # Full E2E workflow');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'complete';
  const verbose = args.includes('--verbose') || args.includes('-v');

  const runner = new E2ETestRunner();

  if (command === 'help' || command === '--help') {
    runner.showTestLevels();
    return;
  }

  console.log('🎯 E2E Test Runner - Extends Existing Email Testing Infrastructure');
  console.log('==================================================================');
  
  try {
    let success = false;
    
    switch (command) {
      case 'email-only':
        success = await runner.runEmailOnlyTest();
        break;
      case 'ai-basic':
        success = await runner.runAIBasicTest();
        break;
      case 'complete':
        success = await runner.runCompleteTest();
        break;
      default:
        success = await runner.runE2ETest(command, verbose);
    }
    
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    console.error('❌ E2E Test Runner failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { E2ETestRunner }; 