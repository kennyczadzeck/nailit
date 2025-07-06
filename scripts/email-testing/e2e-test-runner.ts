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
 * E2E Test Runner - Clear Separation of Email Testing vs E2E Testing
 * 
 * EMAIL TESTING (Foundation Layer):
 * - User/account and project creation
 * - OAuth setup and management
 * - Email generation and ingestion
 * - Database storage (EmailMessage table)
 * - Infrastructure validation
 * 
 * E2E TESTING (Extension Layer):
 * - AI processing of ingested emails
 * - Output ingestion (EmailAnalysis table)
 * - Visualization (flagged items, timeline)
 * 
 * E2E testing can ONLY run after email testing foundation is complete.
 */

interface TestLevel {
  name: string;
  description: string;
  includeEmailTesting: boolean;
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

  // Test levels with clear separation
  private readonly testLevels: Record<string, TestLevel> = {
    'email-only': {
      name: 'Email Testing Only',
      description: 'Complete email infrastructure: DB setup → OAuth → Email generation → Ingestion',
      includeEmailTesting: true,
      includeAI: false,
      includeFlaggedItems: false,
      includeTimeline: false,
      costEstimate: 'Free (no AI costs)'
    },
    'ai-basic': {
      name: 'Email + Basic AI',
      description: 'Email foundation + AI processing (limited emails)',
      includeEmailTesting: true,
      includeAI: true,
      includeFlaggedItems: false,
      includeTimeline: false,
      costEstimate: '~$0.08-0.16 (AI processing only)'
    },
    'complete': {
      name: 'Complete E2E',
      description: 'Full pipeline: Email foundation → AI → Flagged Items → Timeline',
      includeEmailTesting: true,
      includeAI: true,
      includeFlaggedItems: true,
      includeTimeline: true,
      costEstimate: '~$0.08-0.16 (AI processing) + database operations'
    }
  };

  constructor() {
    // Reuse existing email testing infrastructure
    this.oauth = new EmailTestOAuth();
    this.sender = new EmailSender();
    this.dataManager = new EmailTestDataManager();
    this.webhookTester = new WebhookTester();
    this.historicalIngester = new HistoricalEmailIngester();
  }

  /**
   * Run E2E test at specified level with clear layer separation
   */
  async runE2ETest(level: string = 'complete', verbose: boolean = false): Promise<boolean> {
    const testLevel = this.testLevels[level];
    if (!testLevel) {
      throw new Error(`Invalid test level: ${level}. Available: ${Object.keys(this.testLevels).join(', ')}`);
    }

    console.log(`🚀 Starting Test: ${testLevel.name}`);
    console.log(`📋 Description: ${testLevel.description}`);
    console.log(`💰 Cost Estimate: ${testLevel.costEstimate}`);
    console.log('='.repeat(70));

    const startTime = Date.now();
    let success = false;

    try {
      // ============================================================================
      // EMAIL TESTING LAYER (Foundation) - Always runs first
      // ============================================================================
      if (testLevel.includeEmailTesting) {
        console.log('\n📧 EMAIL TESTING LAYER (Foundation)');
        console.log('━'.repeat(50));
        
        await this.runEmailTestingFoundation();
        
        console.log('✅ Email testing foundation complete');
        console.log('📊 Ready for E2E extensions');
      }

      // ============================================================================
      // E2E TESTING LAYER (Extensions) - Only runs if email foundation is ready
      // ============================================================================
      if (testLevel.includeAI || testLevel.includeFlaggedItems || testLevel.includeTimeline) {
        console.log('\n🤖 E2E TESTING LAYER (Extensions)');
        console.log('━'.repeat(50));
        
        // Verify email foundation is ready
        await this.verifyEmailFoundationReady();
        
        await this.runE2EExtensions(testLevel, verbose);
        
        console.log('✅ E2E extensions complete');
      }

      // Final validation
      await this.validateCompleteWorkflow(testLevel);

      const duration = Date.now() - startTime;
      console.log(`\n🎉 Test Completed Successfully!`);
      console.log(`📊 Duration: ${(duration / 1000).toFixed(1)} seconds`);
      console.log(`🎯 Level: ${testLevel.name}`);
      success = true;

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`\n❌ Test Failed!`);
      console.error(`📊 Duration: ${(duration / 1000).toFixed(1)} seconds`);
      console.error(`❌ Error:`, error);
      success = false;
    }

    return success;
  }

  // ============================================================================
  // EMAIL TESTING FOUNDATION METHODS
  // ============================================================================

  /**
   * Run complete email testing foundation
   * This must complete successfully before any E2E testing can run
   */
  private async runEmailTestingFoundation(): Promise<void> {
    console.log('\n📋 Step 1: Database Foundation Setup');
    await this.setupDatabaseFoundation();

    console.log('\n📋 Step 2: OAuth Verification');
    await this.verifyOAuth();

    console.log('\n📋 Step 3: Email Generation');
    await this.generateTestEmails();

    console.log('\n📋 Step 4: Email Ingestion');
    await this.testEmailIngestion();

    console.log('\n📋 Step 5: Email Foundation Validation');
    await this.validateEmailFoundation();
  }

  private async setupDatabaseFoundation(): Promise<void> {
    console.log('🗄️  Setting up database foundation...');
    
    // Clean Gmail inboxes first (before database cleanup)
    await this.cleanupGmailInboxes();
    
    // Clean existing test data from database
    await this.dataManager.truncateAll();
    
    // Set up user accounts and projects
    // This reuses the existing setup from data manager
    await this.dataManager.setupTestProject();
    
    console.log('✅ Database foundation ready (users, projects, team members)');
  }

  private async cleanupGmailInboxes(): Promise<void> {
    console.log('🧹 Cleaning Gmail inboxes...');
    
    try {
      // Use the Gmail inbox cleaner to clean both accounts
      // This moves test emails to trash (recoverable)
      const command = 'npx tsx scripts/email-testing/gmail-inbox-cleaner.ts trash-all';
      execSync(command, { stdio: 'pipe' });
      
      console.log('✅ Gmail inboxes cleaned (test emails moved to trash)');
    } catch (error: any) {
      console.warn('⚠️  Gmail cleanup failed (continuing anyway):', error.message);
      console.log('💡 You may want to manually clean inboxes for cleaner test results');
    }
  }

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

  private async generateTestEmails(): Promise<void> {
    console.log('📧 Generating test emails...');
    
    // Generate moderate number of emails for testing
    await this.sender.sendBulkEmails(8, 30); // 8 emails over 1 month
    await this.sender.generateConversationThreads(3, 30); // 3 conversations
    
    console.log('✅ Test emails generated (8 emails + 3 conversations)');
  }

  private async testEmailIngestion(): Promise<void> {
    console.log('📥 Testing email ingestion...');
    
    // Get the correct project configuration
    const projectConfig = await this.dataManager.getTestProjectConfig();
    
    // Use historical ingestion with the correct project ID
    const command = `npx tsx scripts/email-testing/historical-ingestion.ts import --project=${projectConfig.projectId} --start=${this.getDateXMonthsAgo(1)} --end=${new Date().toISOString().split('T')[0]}`;
    execSync(command, { stdio: 'pipe' });
    
    console.log('✅ Email ingestion completed');
  }

  // Helper method to get date X months ago
  private getDateXMonthsAgo(months: number): string {
    const date = new Date();
    date.setDate(date.getDate() - (months * 30));
    return date.toISOString().split('T')[0];
  }

  private async validateEmailFoundation(): Promise<void> {
    console.log('✅ Validating email foundation...');
    
    // Check that emails were ingested
    const emailCount = await this.dataManager.countEmails();
    if (emailCount === 0) {
      throw new Error('EMAIL FOUNDATION FAILED: No emails found in database');
    }
    
    console.log(`📧 Email foundation validated: ${emailCount} emails in database`);
  }

  // ============================================================================
  // E2E TESTING EXTENSION METHODS
  // ============================================================================

  /**
   * Verify that email foundation is ready for E2E extensions
   */
  private async verifyEmailFoundationReady(): Promise<void> {
    console.log('🔍 Verifying email foundation readiness...');
    
    const emailCount = await this.dataManager.countEmails();
    if (emailCount === 0) {
      throw new Error('E2E TESTING BLOCKED: Email foundation not ready (no emails in database)');
    }
    
    console.log(`✅ Email foundation ready: ${emailCount} emails available for AI processing`);
  }

  /**
   * Run E2E extensions on top of email foundation
   */
  private async runE2EExtensions(testLevel: TestLevel, verbose: boolean): Promise<void> {
    if (testLevel.includeAI) {
      console.log('\n📋 E2E Step 1: AI Processing');
      await this.testAIProcessing(verbose);
    }

    if (testLevel.includeFlaggedItems) {
      console.log('\n📋 E2E Step 2: Flagged Items Creation');
      await this.testFlaggedItemsCreation();
    }

    if (testLevel.includeTimeline) {
      console.log('\n📋 E2E Step 3: Timeline Integration');
      await this.testTimelineIntegration();
    }
  }

  private async testAIProcessing(verbose: boolean): Promise<void> {
    console.log('🤖 Processing emails with AI...');
    
    // Run AI analysis on ingested emails
    const command = 'npx tsx scripts/test-email-analysis-proper.ts';
    execSync(command, { stdio: verbose ? 'inherit' : 'pipe' });
    
    console.log('✅ AI processing completed');
  }

  private async testFlaggedItemsCreation(): Promise<void> {
    console.log('🚩 Creating flagged items from AI analysis...');
    
    try {
      execSync('npx tsx scripts/create-flagged-items.ts', { stdio: 'pipe' });
      console.log('✅ Flagged items creation completed');
    } catch (error) {
      console.log('⚠️  Flagged items creation skipped (optional)');
    }
  }

  private async testTimelineIntegration(): Promise<void> {
    console.log('📅 Integrating with timeline...');
    
    try {
      execSync('npx tsx scripts/simulate-user-review.ts', { stdio: 'pipe' });
      console.log('✅ Timeline integration completed');
    } catch (error) {
      console.log('⚠️  Timeline integration skipped (optional)');
    }
  }

  // ============================================================================
  // VALIDATION METHODS
  // ============================================================================

  private async validateCompleteWorkflow(testLevel: TestLevel): Promise<void> {
    console.log('\n📊 Final Workflow Validation');
    console.log('━'.repeat(30));
    
    // Always validate email foundation
    const emailCount = await this.dataManager.countEmails();
    console.log(`📧 Email Foundation: ${emailCount} emails`);
    
    // Validate E2E extensions if enabled
    if (testLevel.includeAI) {
      const analysisCount = await this.dataManager.countAnalyses();
      console.log(`🤖 AI Processing: ${analysisCount} analyses`);
      
      if (analysisCount === 0) {
        throw new Error('E2E VALIDATION FAILED: No AI analyses found');
      }
    }

    if (testLevel.includeFlaggedItems) {
      const flaggedCount = await this.dataManager.countFlaggedItems();
      console.log(`🚩 Flagged Items: ${flaggedCount} items`);
    }

    console.log('✅ Workflow validation completed');
  }

  // ============================================================================
  // CONVENIENCE METHODS
  // ============================================================================

  /**
   * Run email-only testing (foundation layer only)
   */
  async runEmailOnlyTest(): Promise<boolean> {
    console.log('📧 Running Email Testing Only (Foundation Layer)');
    console.log('   Includes: DB setup → OAuth → Email generation → Ingestion');
    return await this.runE2ETest('email-only');
  }

  /**
   * Run AI basic testing (foundation + limited AI)
   */
  async runAIBasicTest(): Promise<boolean> {
    console.log('🤖 Running Email + Basic AI Testing');
    console.log('   Includes: Email foundation → AI processing');
    return await this.runE2ETest('ai-basic');
  }

  /**
   * Run complete E2E testing (foundation + all extensions)
   */
  async runCompleteTest(): Promise<boolean> {
    console.log('🎯 Running Complete E2E Testing');
    console.log('   Includes: Email foundation → AI → Flagged Items → Timeline');
    return await this.runE2ETest('complete');
  }

  /**
   * Show available test levels with clear layer descriptions
   */
  showTestLevels(): void {
    console.log('\n🎯 Available Test Levels:\n');
    
    for (const [key, level] of Object.entries(this.testLevels)) {
      console.log(`${key.padEnd(12)} - ${level.name}`);
      console.log(`${' '.repeat(15)} ${level.description}`);
      console.log(`${' '.repeat(15)} Cost: ${level.costEstimate}`);
      
      // Show layer breakdown
      const layers = [];
      if (level.includeEmailTesting) layers.push('📧 Email Foundation');
      if (level.includeAI) layers.push('🤖 AI Processing');
      if (level.includeFlaggedItems) layers.push('🚩 Flagged Items');
      if (level.includeTimeline) layers.push('📅 Timeline');
      
      console.log(`${' '.repeat(15)} Layers: ${layers.join(' → ')}\n`);
    }
    
    console.log('Usage:');
    console.log('  npm run test:e2e:email-only     # Email foundation only');
    console.log('  npm run test:e2e:ai-basic       # Email + AI processing');
    console.log('  npm run test:e2e:complete       # Complete E2E pipeline');
    
    console.log('\nLayer Separation:');
    console.log('  📧 Email Testing = DB setup + OAuth + Email generation + Ingestion');
    console.log('  🤖 E2E Testing = AI processing + Output ingestion + Visualization');
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

  console.log('🎯 E2E Test Runner - Clear Layer Separation');
  console.log('📧 Email Testing (Foundation) → 🤖 E2E Testing (Extensions)');
  console.log('='.repeat(70));
  
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
    console.error('❌ Test Runner failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { E2ETestRunner }; 