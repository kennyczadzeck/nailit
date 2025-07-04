#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { google } from 'googleapis';
import { EmailTestOAuth } from './oauth-setup';
import { EmailTestDataManager } from './data-manager';
import { prisma } from '../../app/lib/prisma';

// Load environment variables
config({ path: '.env.local' });

/**
 * Historical Email Ingestion Testing Utility
 * 
 * Tests bulk processing of existing emails from Gmail API for customers
 * who start using NailIt after their project has already started.
 * 
 * Key scenarios:
 * - Mid-project onboarding (6 months of existing emails)
 * - Large scale processing (1000+ emails)
 * - Rate limiting compliance
 * - Progress tracking and error handling
 */

interface HistoricalImportConfig {
  projectId: string;
  startDate: string; // ISO date string
  endDate: string;   // ISO date string
  batchSize: number;
  maxEmails?: number;
  includeAttachments: boolean;
}

interface ImportProgress {
  totalEmails: number;
  processedEmails: number;
  batchesCompleted: number;
  totalBatches: number;
  startTime: Date;
  estimatedCompletion?: Date;
  errors: string[];
}

class HistoricalEmailIngester {
  private oauth: EmailTestOAuth;
  private dataManager: EmailTestDataManager;
  private progress: ImportProgress;

  constructor() {
    this.oauth = new EmailTestOAuth();
    this.dataManager = new EmailTestDataManager();
    this.progress = {
      totalEmails: 0,
      processedEmails: 0,
      batchesCompleted: 0,
      totalBatches: 0,
      startTime: new Date(),
      errors: []
    };
  }

  /**
   * Discover historical project emails within date range
   */
  async discoverHistoricalEmails(config: HistoricalImportConfig): Promise<string[]> {
    console.log(`🔍 Discovering historical emails for project ${config.projectId}`);
    console.log(`📅 Date range: ${config.startDate} to ${config.endDate}`);

    try {
      const gmail = this.oauth.getGmailClient('homeowner');
      
      // Convert dates to Gmail API format
      const startDate = new Date(config.startDate);
      const endDate = new Date(config.endDate);
      
      // Build search query for renovation-related emails
      const searchQuery = this.buildProjectSearchQuery(startDate, endDate);
      
      console.log(`🔎 Search query: ${searchQuery}`);

      // Debug: Test credentials first
      console.log(`🔐 Testing credentials...`);
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log(`✅ Connected as: ${profile.data.emailAddress}`);

      // Search for emails in date range
      console.log(`📡 Making Gmail API search request...`);
      const searchResponse = await gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: config.maxEmails || 1000
      });

      console.log(`📊 Raw API response:`, {
        resultSizeEstimate: searchResponse.data.resultSizeEstimate,
        messagesLength: searchResponse.data.messages?.length || 0,
        nextPageToken: searchResponse.data.nextPageToken
      });

      const messageIds = searchResponse.data.messages?.map(msg => msg.id!) || [];
      
      console.log(`📧 Discovered ${messageIds.length} potential project emails`);
      
      if (messageIds.length === 0) {
        console.log(`ℹ️  No emails found in date range. You may need to:`);
        console.log(`   1. Send some test emails first with: npm run test:send-bulk-emails`);
        console.log(`   2. Adjust the date range`);
        console.log(`   3. Check OAuth permissions`);
      }

      return messageIds;

    } catch (error: any) {
      console.error(`❌ Failed to discover historical emails:`, error.message);
      throw error;
    }
  }

  /**
   * Process historical emails in batches with rate limiting
   */
  async processHistoricalEmails(config: HistoricalImportConfig): Promise<void> {
    console.log(`\n🚀 Starting Historical Email Import`);

    try {
      // Step 1: Discover emails
      const messageIds = await this.discoverHistoricalEmails(config);
      
      if (messageIds.length === 0) {
        console.log(`⚠️  No emails to process. Import completed.`);
        return;
      }

      // Step 2: Initialize progress tracking
      this.initializeProgress(messageIds.length, config.batchSize);

      // Step 3: Process in batches
      const batches = this.createBatches(messageIds, config.batchSize);
      
      console.log(`\n📊 Processing ${messageIds.length} emails in ${batches.length} batches`);
      console.log(`⚙️  Batch size: ${config.batchSize}`);
      console.log(`🕐 Estimated time: ${this.estimateProcessingTime(messageIds.length)} minutes`);

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];
        
        console.log(`\n📦 Processing batch ${i + 1}/${batches.length} (${batch.length} emails)`);
        
        try {
          await this.processBatch(batch, config.projectId, config.includeAttachments);
          this.updateProgress(batch.length);
          
          // Rate limiting: Wait between batches to respect Gmail API quotas
          if (i < batches.length - 1) {
            console.log(`⏱️  Waiting 2 seconds for rate limiting...`);
            await this.delay(2000);
          }
          
        } catch (batchError: any) {
          console.error(`❌ Batch ${i + 1} failed:`, batchError.message);
          this.progress.errors.push(`Batch ${i + 1}: ${batchError.message}`);
          // Continue with next batch
        }
      }

      // Step 4: Final results
      this.displayFinalResults();

    } catch (error: any) {
      console.error(`❌ Historical import failed:`, error.message);
      throw error;
    }
  }

  /**
   * Test historical ingestion scenarios
   */
  async testHistoricalScenarios(): Promise<void> {
    console.log(`\n🧪 Testing Historical Email Ingestion Scenarios\n`);

    const scenarios = [
      {
        name: 'Recent Project (1 month)',
        config: {
          projectId: 'recent-kitchen-reno',
          startDate: this.getDateXMonthsAgo(1),
          endDate: new Date().toISOString().split('T')[0],
          batchSize: 10,
          maxEmails: 50,
          includeAttachments: false
        }
      },
      {
        name: 'Mid-Project Onboarding (6 months)',
        config: {
          projectId: 'mid-project-bathroom',
          startDate: this.getDateXMonthsAgo(6),
          endDate: new Date().toISOString().split('T')[0],
          batchSize: 25,
          maxEmails: 200,
          includeAttachments: true
        }
      },
      {
        name: 'Large Project History (12 months)',
        config: {
          projectId: 'large-home-renovation',
          startDate: this.getDateXMonthsAgo(12),
          endDate: new Date().toISOString().split('T')[0],
          batchSize: 50,
          maxEmails: 1000,
          includeAttachments: true
        }
      }
    ];

    for (const scenario of scenarios) {
      console.log(`\n📋 Scenario: ${scenario.name}`);
      console.log(`📅 Date range: ${scenario.config.startDate} to ${scenario.config.endDate}`);
      
      try {
        const messageIds = await this.discoverHistoricalEmails(scenario.config);
        console.log(`✅ Found ${messageIds.length} emails for ${scenario.name}`);
        
        if (messageIds.length > 0) {
          console.log(`   Sample message IDs: ${messageIds.slice(0, 3).join(', ')}`);
        }
        
      } catch (error: any) {
        console.error(`❌ Scenario ${scenario.name} failed:`, error.message);
      }
    }

    console.log(`\n✅ Historical scenarios testing complete`);
  }

  /**
   * Process a batch of email IDs
   */
  private async processBatch(messageIds: string[], projectId: string, includeAttachments: boolean): Promise<void> {
    const gmail = this.oauth.getGmailClient('homeowner');
    
    for (const messageId of messageIds) {
      try {
        // Check if email already exists
        const existingEmail = await prisma.emailMessage.findUnique({
          where: { messageId: messageId }
        });

        if (existingEmail) {
          console.log(`  ⏭️  Skipped: Email ${messageId} already exists`);
          continue;
        }

        // Fetch email details
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: messageId,
          format: 'full'
        });

        const message = messageResponse.data;
        const headers = message.payload?.headers || [];
        
        // Extract email metadata
        const subject = headers.find(h => h.name === 'Subject')?.value || '';
        const from = headers.find(h => h.name === 'From')?.value || '';
        const to = headers.find(h => h.name === 'To')?.value || '';
        const date = headers.find(h => h.name === 'Date')?.value || '';
        
        // Get the current test project config to use the correct user ID
        const { EmailTestDataManager } = await import('./data-manager');
        const dataManager = new EmailTestDataManager();
        const projectConfig = await dataManager.getTestProjectConfig();
        const homeownerUserId = projectConfig.userId;
        
        // Create EmailMessage record
        await prisma.emailMessage.create({
          data: {
            messageId: messageId,
            provider: 'gmail',
            sender: from,
            recipients: [to],
            subject: subject,
            sentAt: new Date(date),
            ingestionStatus: 'completed',
            analysisStatus: 'pending',
            assignmentStatus: 'pending',
            userId: homeownerUserId,
            projectId: projectId,
            providerData: {
              historicalImport: true,
              originalMessageId: messageId,
              importedAt: new Date().toISOString()
            }
          }
        });

        console.log(`  ✓ Processed: ${subject.substring(0, 50)}...`);
        
      } catch (emailError: any) {
        console.error(`  ❌ Failed to process email ${messageId}:`, emailError.message);
        this.progress.errors.push(`Email ${messageId}: ${emailError.message}`);
      }
    }
  }

  /**
   * Build Gmail search query for project emails
   */
  private buildProjectSearchQuery(startDate: Date, endDate: Date): string {
    const startDateStr = startDate.toISOString().split('T')[0].replace(/-/g, '/');
    // const endDateStr = endDate.toISOString().split('T')[0].replace(/-/g, '/');
    
    // Use simpler search terms that Gmail handles better
    // Focus on most common renovation keywords with proper capitalization
    const dateQuery = `after:${startDateStr}`;
    // Temporarily remove "before" constraint as it seems to cause issues with Gmail API
    
    // Search for key terms that match our test email patterns
    // Use proper capitalization as Gmail search is case-sensitive
    return `Renovation ${dateQuery}`;
  }

  /**
   * Initialize progress tracking
   */
  private initializeProgress(totalEmails: number, batchSize: number): void {
    this.progress = {
      totalEmails,
      processedEmails: 0,
      batchesCompleted: 0,
      totalBatches: Math.ceil(totalEmails / batchSize),
      startTime: new Date(),
      errors: []
    };
  }

  /**
   * Update progress after batch completion
   */
  private updateProgress(emailsProcessed: number): void {
    this.progress.processedEmails += emailsProcessed;
    this.progress.batchesCompleted += 1;
    
    const percentComplete = (this.progress.processedEmails / this.progress.totalEmails) * 100;
    const elapsed = Date.now() - this.progress.startTime.getTime();
    const emailsPerMs = this.progress.processedEmails / elapsed;
    const remainingEmails = this.progress.totalEmails - this.progress.processedEmails;
    const estimatedRemainingMs = remainingEmails / emailsPerMs;
    
    this.progress.estimatedCompletion = new Date(Date.now() + estimatedRemainingMs);
    
    console.log(`📊 Progress: ${this.progress.processedEmails}/${this.progress.totalEmails} (${percentComplete.toFixed(1)}%)`);
    console.log(`🕐 ETA: ${this.progress.estimatedCompletion.toLocaleTimeString()}`);
  }

  /**
   * Display final import results
   */
  private displayFinalResults(): void {
    const duration = Date.now() - this.progress.startTime.getTime();
    const durationMinutes = (duration / 1000 / 60).toFixed(1);
    
    console.log(`\n🎉 Historical Import Complete!`);
    console.log(`📊 Final Results:`);
    console.log(`   • Total emails processed: ${this.progress.processedEmails}`);
    console.log(`   • Total batches: ${this.progress.batchesCompleted}`);
    console.log(`   • Duration: ${durationMinutes} minutes`);
    console.log(`   • Average: ${(this.progress.processedEmails / parseFloat(durationMinutes)).toFixed(1)} emails/minute`);
    
    if (this.progress.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered:`);
      this.progress.errors.forEach(error => console.log(`   • ${error}`));
    }
  }

  // Helper methods
  private createBatches<T>(array: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < array.length; i += batchSize) {
      batches.push(array.slice(i, i + batchSize));
    }
    return batches;
  }

  private getDateXMonthsAgo(months: number): string {
    const date = new Date();
    date.setDate(date.getDate() - (months * 30)); // Use days instead of months for better accuracy
    return date.toISOString().split('T')[0];
  }

  private estimateProcessingTime(emailCount: number): number {
    // Estimate based on batch size and rate limiting
    const emailsPerMinute = 30; // Conservative estimate with rate limiting
    return Math.ceil(emailCount / emailsPerMinute);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`\n🕐 Historical Email Ingestion Tester\n`);
    console.log(`Usage:`);
    console.log(`  npm run test:historical-discover --project=<id> --months=<number>`);
    console.log(`  npm run test:historical-import --project=<id> --start=<date> --end=<date>`);
    console.log(`  npm run test:historical-scenarios`);
    console.log(`\nExamples:`);
    console.log(`  npm run test:historical-discover --project=kitchen-reno --months=6`);
    console.log(`  npm run test:historical-import --project=bath-reno --start=2024-06-01 --end=2025-01-01`);
    console.log(`  npm run test:historical-scenarios`);
    console.log(`\nPrerequisites:`);
    console.log(`  - OAuth credentials set up for homeowner account`);
    console.log(`  - Some historical emails in the test Gmail account`);
    console.log(`  - Database connection working`);
    return;
  }

  const ingester = new HistoricalEmailIngester();

  try {
    switch (command) {
      case 'discover':
        const projectId = args.find(arg => arg.startsWith('--project='))?.split('=')[1] || 'test-project';
        const months = parseInt(args.find(arg => arg.startsWith('--months='))?.split('=')[1] || '6');
        
        const config = {
          projectId,
          startDate: ingester['getDateXMonthsAgo'](months),
          endDate: new Date().toISOString().split('T')[0],
          batchSize: 50,
          includeAttachments: false
        };
        
        await ingester.discoverHistoricalEmails(config);
        break;

      case 'import':
        const importProjectId = args.find(arg => arg.startsWith('--project='))?.split('=')[1] || 'test-project';
        const startDate = args.find(arg => arg.startsWith('--start='))?.split('=')[1];
        const endDate = args.find(arg => arg.startsWith('--end='))?.split('=')[1];
        
        const importConfig = {
          projectId: importProjectId,
          startDate: startDate || ingester['getDateXMonthsAgo'](3),
          endDate: endDate || new Date().toISOString().split('T')[0],
          batchSize: 25,
          includeAttachments: false
        };
        
        await ingester.processHistoricalEmails(importConfig);
        break;

      case 'scenarios':
        await ingester.testHistoricalScenarios();
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

export { HistoricalEmailIngester }; 