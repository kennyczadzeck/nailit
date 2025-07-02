#!/usr/bin/env ts-node

import { EmailTestOAuth } from './oauth-setup';
import { google } from 'googleapis';

/**
 * Webhook Testing Utility
 * 
 * Sets up and tests Gmail push notifications for real-time email ingestion testing
 */

class WebhookTester {
  private oauth: EmailTestOAuth;
  private webhookUrl: string;

  constructor() {
    this.oauth = new EmailTestOAuth();
    
    // Use the appropriate webhook URL based on environment
    const environment = process.env.NAILIT_ENVIRONMENT || 'development';
    switch (environment) {
      case 'development':
        this.webhookUrl = 'https://u9eack5h4f.us-east-1.awsapprunner.com/api/email/webhook/gmail'\;
        break;
      case 'staging':
        this.webhookUrl = 'https://ubfybdadun.us-east-1.awsapprunner.com/api/email/webhook/gmail'\;
        break;
      case 'production':
        this.webhookUrl = 'https://ijj2mc7dhz.us-east-1.awsapprunner.com/api/email/webhook/gmail'\;
        break;
      default:
        this.webhookUrl = 'http://localhost:3001/api/email/webhook/gmail'\;
    }
  }

  /**
   * Set up Gmail push notification for homeowner account
   */
  async setupWebhook(): Promise<void> {
    console.log(`🔔 Setting up Gmail webhook for homeowner account...`);
    console.log(`📡 Webhook URL: ${this.webhookUrl}`);

    try {
      const gmail = this.oauth.getGmailClient('homeowner');

      // Create a watch request for the homeowner's inbox
      const watchRequest = {
        userId: 'me',
        requestBody: {
          topicName: 'projects/nailit-dev/topics/nailit-dev-notifications', // This should match your SNS topic
          labelIds: ['INBOX'],
          labelFilterAction: 'include'
        }
      };

      const response = await gmail.users.watch(watchRequest);

      console.log(`✅ Webhook subscription created:`);
      console.log(`   History ID: ${response.data.historyId}`);
      console.log(`   Expiration: ${new Date(parseInt(response.data.expiration!)).toISOString()}`);

      // Store subscription details for later reference
      const subscriptionInfo = {
        historyId: response.data.historyId,
        expiration: response.data.expiration,
        webhookUrl: this.webhookUrl,
        setupTime: new Date().toISOString()
      };

      console.log(`\n📋 Subscription Details:`);
      console.table(subscriptionInfo);

    } catch (error: any) {
      console.error(`❌ Failed to setup webhook:`, error.message);
      throw error;
    }
  }

  /**
   * Stop Gmail push notifications
   */
  async stopWebhook(): Promise<void> {
    console.log(`🛑 Stopping Gmail webhook for homeowner account...`);

    try {
      const gmail = this.oauth.getGmailClient('homeowner');

      await gmail.users.stop({
        userId: 'me'
      });

      console.log(`✅ Webhook subscription stopped`);

    } catch (error: any) {
      console.error(`❌ Failed to stop webhook:`, error.message);
      throw error;
    }
  }

  /**
   * Test webhook by sending email and validating processing
   */
  async testWebhook(timeoutSeconds: number = 30): Promise<void> {
    console.log(`🧪 Testing webhook with ${timeoutSeconds}s timeout...`);

    // Import email sender here to avoid circular dependencies
    const { EmailSender } = await import('./email-sender');
    const sender = new EmailSender();

    const testSubject = `Webhook Test - ${new Date().toISOString()}`;
    
    try {
      console.log(`📧 Sending test email...`);
      await sender.sendTestEmail('urgent-issue', testSubject);

      console.log(`⏱️  Waiting ${timeoutSeconds} seconds for webhook processing...`);
      
      // Wait for webhook processing
      await this.delay(timeoutSeconds * 1000);

      // Check if email was ingested
      const { EmailTestDataManager } = await import('./data-manager');
      const dataManager = new EmailTestDataManager();
      
      console.log(`🔍 Checking for ingested email...`);
      await dataManager.queryEmails(5);

      console.log(`✅ Webhook test complete`);

    } catch (error: any) {
      console.error(`❌ Webhook test failed:`, error.message);
      throw error;
    }
  }

  /**
   * Validate webhook subscription status
   */
  async validateWebhookSubscription(): Promise<void> {
    console.log(`🔍 Validating webhook subscription status...`);

    try {
      const gmail = this.oauth.getGmailClient('homeowner');
      
      // Get user profile to check current watch status
      const profile = await gmail.users.getProfile({ userId: 'me' });
      
      console.log(`📧 Email: ${profile.data.emailAddress}`);
      console.log(`📊 Messages Total: ${profile.data.messagesTotal}`);
      console.log(`📈 Threads Total: ${profile.data.threadsTotal}`);
      console.log(`📚 History ID: ${profile.data.historyId}`);

      // Note: Gmail API doesn't provide a direct way to check active watch subscriptions
      // The subscription status is managed server-side and expires automatically
      console.log(`\n⚠️  Gmail API doesn't provide direct watch status checking`);
      console.log(`   Webhook subscriptions expire automatically after 7 days`);
      console.log(`   To test if webhook is active, send a test email`);

    } catch (error: any) {
      console.error(`❌ Failed to validate webhook subscription:`, error.message);
      throw error;
    }
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
    console.log(`\n🔔 Gmail Webhook Tester\n`);
    console.log(`Usage:`);
    console.log(`  npm run test:setup-webhook`);
    console.log(`  npm run test:stop-webhook`);
    console.log(`  npm run test:validate-webhook [timeout_seconds]`);
    console.log(`  npm run test:check-webhook-subscription`);
    console.log(`\nExamples:`);
    console.log(`  npm run test:setup-webhook`);
    console.log(`  npm run test:validate-webhook 45`);
    console.log(`  npm run test:stop-webhook`);
    return;
  }

  const tester = new WebhookTester();

  try {
    switch (command) {
      case 'setup':
        await tester.setupWebhook();
        break;

      case 'stop':
        await tester.stopWebhook();
        break;

      case 'test':
        const timeout = parseInt(args[1]) || 30;
        await tester.testWebhook(timeout);
        break;

      case 'validate':
        await tester.validateWebhookSubscription();
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

export { WebhookTester };
