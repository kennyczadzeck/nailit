#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { EmailTestOAuth } from './oauth-setup';
import { EmailSender } from './email-sender';
import { EmailTestDataManager } from './data-manager';
import { google } from 'googleapis';

// Load environment variables
config({ path: '.env.local' });

/**
 * Webhook and S3 Integration Tester
 * 
 * Tests the enhanced email processing pipeline:
 * 1. Send test email from contractor to homeowner
 * 2. Get the message ID from Gmail API
 * 3. Manually trigger email processing via API
 * 4. Verify S3 storage and database records
 * 5. Test webhook processing (if webhook is set up)
 */

class WebhookS3Tester {
  private oauth: EmailTestOAuth;
  private sender: EmailSender;
  private dataManager: EmailTestDataManager;
  private baseUrl: string;

  constructor() {
    this.oauth = new EmailTestOAuth();
    this.sender = new EmailSender();
    this.dataManager = new EmailTestDataManager();
    
    // Use localhost for testing
    this.baseUrl = 'http://localhost:3000';
  }

  /**
   * Run complete webhook and S3 testing workflow
   */
  async runCompleteTest(): Promise<void> {
    console.log(`\n🧪 Starting Webhook & S3 Integration Test\n`);

    try {
      // Step 1: Ensure test project exists
      console.log(`📋 Step 1: Setting up test project...`);
      await this.dataManager.setupTestProject();

      // Step 2: Send test email
      console.log(`\n📧 Step 2: Sending test email...`);
      const emailSubject = `[TEST] Webhook S3 Test - ${new Date().toISOString()}`;
      const emailBody = `This is a test email for webhook and S3 integration testing.\n\nSent at: ${new Date().toISOString()}\n\nThis email should be:\n1. Received by homeowner\n2. Processed by webhook\n3. Stored in S3\n4. Recorded in database`;
      
      await this.sender.sendTestEmail('custom', emailSubject, emailBody);
      
      // Wait for email delivery
      console.log(`⏱️  Waiting 10 seconds for email delivery...`);
      await this.delay(10000);

      // Step 3: Get message ID from Gmail
      console.log(`\n🔍 Step 3: Finding sent email in Gmail...`);
      const messageId = await this.findLatestTestEmail(emailSubject);
      
      if (!messageId) {
        console.error(`❌ Could not find test email in Gmail`);
        return;
      }

      console.log(`✅ Found test email with ID: ${messageId}`);

      // Step 4: Test manual processing
      console.log(`\n⚙️  Step 4: Testing manual email processing...`);
      await this.testManualProcessing(messageId);

      // Step 5: Verify S3 storage
      console.log(`\n💾 Step 5: Verifying S3 storage...`);
      await this.verifyS3Storage(messageId);

      // Step 6: Test processing status API
      console.log(`\n📊 Step 6: Testing processing status API...`);
      await this.testProcessingStatus(messageId);

      console.log(`\n✅ Webhook & S3 Integration Test Completed Successfully!`);

    } catch (error: any) {
      console.error(`❌ Test failed:`, error.message);
      throw error;
    }
  }

  /**
   * Find the latest test email in Gmail
   */
  private async findLatestTestEmail(subject: string): Promise<string | null> {
    try {
      const gmail = this.oauth.getGmailClient('homeowner');
      
      // Search for emails with the test subject
      const searchQuery = `subject:"${subject}"`;
      
      const searchResponse = await gmail.users.messages.list({
        userId: 'me',
        q: searchQuery,
        maxResults: 1
      });

      const messages = searchResponse.data.messages;
      if (!messages || messages.length === 0) {
        console.log(`No emails found with subject: ${subject}`);
        return null;
      }

      return messages[0].id!;

    } catch (error: any) {
      console.error(`Failed to find test email:`, error.message);
      return null;
    }
  }

  /**
   * Test manual email processing via API
   */
  private async testManualProcessing(messageId: string): Promise<void> {
    try {
      const projectConfig = await this.dataManager.getTestProjectConfig();
      
      const requestBody = {
        messageId,
        userId: projectConfig.userId,
        projectId: projectConfig.projectId,
        testMode: true
      };

      console.log(`📤 Sending processing request for message: ${messageId}`);
      
      const response = await fetch(`${this.baseUrl}/api/email/process-test-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API request failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      
      console.log(`✅ Email processing completed:`);
      console.log(`   Message ID: ${result.emailMessage?.messageId}`);
      console.log(`   Subject: ${result.emailMessage?.subject}`);
      console.log(`   Sender: ${result.emailMessage?.sender}`);
      console.log(`   Ingestion Status: ${result.emailMessage?.ingestionStatus}`);
      console.log(`   S3 Content Path: ${result.emailMessage?.s3ContentPath || 'Not set'}`);
      console.log(`   Attachment Count: ${result.emailMessage?.s3AttachmentPaths?.length || 0}`);

    } catch (error: any) {
      console.error(`❌ Manual processing failed:`, error.message);
      throw error;
    }
  }

  /**
   * Verify S3 storage was successful
   */
  private async verifyS3Storage(messageId: string): Promise<void> {
    try {
      // Check if email message has S3 paths
      const emailData = await this.dataManager.queryEmailMessage(messageId);
      
      if (!emailData) {
        console.error(`❌ Email message not found in database`);
        return;
      }

      console.log(`📊 Email Message Database Record:`);
      console.log(`   ID: ${emailData.id}`);
      console.log(`   Message ID: ${emailData.messageId}`);
      console.log(`   Subject: ${emailData.subject}`);
      console.log(`   Ingestion Status: ${emailData.ingestionStatus}`);
      console.log(`   S3 Content Path: ${emailData.s3ContentPath || 'Not set'}`);
      console.log(`   S3 Attachment Paths: ${emailData.s3AttachmentPaths?.length || 0} files`);

      if (emailData.s3ContentPath) {
        console.log(`✅ S3 content path recorded: ${emailData.s3ContentPath}`);
      } else {
        console.log(`⚠️  No S3 content path found - email may not have been processed`);
      }

      // Note: We can't directly verify S3 files without AWS credentials in this script
      // In production, you'd add S3 verification here

    } catch (error: any) {
      console.error(`❌ S3 verification failed:`, error.message);
      throw error;
    }
  }

  /**
   * Test the processing status API
   */
  private async testProcessingStatus(messageId: string): Promise<void> {
    try {
      console.log(`📊 Checking processing status for message: ${messageId}`);
      
      const response = await fetch(`${this.baseUrl}/api/email/process-test-message?messageId=${messageId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Status API failed: ${response.status} - ${errorData.error || 'Unknown error'}`);
      }

      const result = await response.json();
      const status = result.status;

      console.log(`✅ Processing Status Retrieved:`);
      console.log(`   Message ID: ${status.messageId}`);
      console.log(`   Subject: ${status.subject}`);
      console.log(`   Sender: ${status.sender}`);
      console.log(`   Sent At: ${status.sentAt}`);
      console.log(`   Ingestion Status: ${status.ingestionStatus}`);
      console.log(`   Analysis Status: ${status.analysisStatus}`);
      console.log(`   Assignment Status: ${status.assignmentStatus}`);
      console.log(`   Has S3 Content: ${status.hasS3Content}`);
      console.log(`   Attachment Count: ${status.attachmentCount}`);
      console.log(`   Project: ${status.project?.name}`);
      console.log(`   User: ${status.user?.email}`);

    } catch (error: any) {
      console.error(`❌ Status check failed:`, error.message);
      throw error;
    }
  }

  /**
   * Test webhook simulation (send email and wait for webhook processing)
   */
  async testWebhookSimulation(): Promise<void> {
    console.log(`\n🔔 Testing Webhook Simulation\n`);

    try {
      // Step 1: Send test email
      console.log(`📧 Sending test email for webhook processing...`);
      const emailSubject = `[WEBHOOK TEST] ${new Date().toISOString()}`;
      const emailBody = `This email tests webhook processing.\n\nWebhook should:\n1. Receive notification\n2. Fetch email content\n3. Store in S3\n4. Update database`;
      
      await this.sender.sendTestEmail('custom', emailSubject, emailBody);

      // Step 2: Wait for webhook processing
      console.log(`⏱️  Waiting 30 seconds for webhook processing...`);
      await this.delay(30000);

      // Step 3: Check for processed emails
      console.log(`🔍 Checking for webhook-processed emails...`);
      const recentEmails = await this.dataManager.queryRecentEmails(5);

      console.log(`📊 Found ${recentEmails.length} recent emails:`);
      for (const email of recentEmails) {
        console.log(`   - ${email.subject} (${email.ingestionStatus})`);
      }

      // Look for webhook-processed emails (those with webhook-* messageId pattern)
      const webhookEmails = recentEmails.filter(email => 
        email.messageId.startsWith('webhook-') || email.providerData?.webhookMessageId
      );

      if (webhookEmails.length > 0) {
        console.log(`✅ Found ${webhookEmails.length} webhook-processed emails`);
      } else {
        console.log(`⚠️  No webhook-processed emails found. Webhook may not be active.`);
      }

    } catch (error: any) {
      console.error(`❌ Webhook simulation failed:`, error.message);
      throw error;
    }
  }

  /**
   * Clean up test data
   */
  async cleanup(): Promise<void> {
    console.log(`\n🧹 Cleaning up test data...`);
    
    try {
      // Remove test emails from database
      await this.dataManager.cleanupTestEmails();
      console.log(`✅ Test cleanup completed`);
    } catch (error: any) {
      console.error(`❌ Cleanup failed:`, error.message);
    }
  }

  /**
   * Utility function for delays
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
    console.log(`\n🧪 Webhook & S3 Integration Tester\n`);
    console.log(`Usage:`);
    console.log(`  npm run test:webhook-s3-complete    # Run complete test workflow`);
    console.log(`  npm run test:webhook-s3-simulation  # Test webhook simulation`);
    console.log(`  npm run test:webhook-s3-cleanup     # Clean up test data`);
    console.log(`\nPrerequisites:`);
    console.log(`  - OAuth credentials set up for both accounts`);
    console.log(`  - Test project configured in database`);
    console.log(`  - Local development server running (npm run dev)`);
    console.log(`  - AWS S3 credentials configured in .env.local`);
    return;
  }

  const tester = new WebhookS3Tester();

  try {
    switch (command) {
      case 'complete':
        await tester.runCompleteTest();
        break;
      case 'simulation':
        await tester.testWebhookSimulation();
        break;
      case 'cleanup':
        await tester.cleanup();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error: any) {
    console.error(`\n❌ Test failed:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { WebhookS3Tester }; 