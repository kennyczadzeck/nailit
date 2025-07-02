#!/usr/bin/env ts-node

import { EmailTestOAuth } from './oauth-setup';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Email Sender Utility for Testing
 * 
 * Sends mock contractor emails to homeowner account for testing:
 * - Cost changes
 * - Schedule delays  
 * - Material substitutions
 * - General updates
 */

interface EmailTemplate {
  subject: string;
  body: string;
  attachments?: string[];
}

const EMAIL_TEMPLATES: Record<string, EmailTemplate> = {
  'cost-change': {
    subject: 'Kitchen Renovation - Cost Update Required',
    body: `Hi Sarah,

I wanted to give you a heads up about the kitchen renovation. During demolition, we discovered some unexpected plumbing issues behind the sink wall that need to be addressed.

The additional plumbing work will cost an extra $2,800 and add 3 days to our timeline. This includes:
- Replacing corroded pipes ($1,200)
- Updating to code compliance ($900) 
- Additional labor ($700)

I can show you the damage tomorrow if you'd like to see it before we proceed.

Best,
Mike Johnson
Johnson Construction`
  },

  'schedule-delay': {
    subject: 'Bathroom Remodel - Schedule Update',
    body: `Hi Sarah,

Unfortunately, the custom tiles you ordered are delayed by 2 weeks due to shipping issues. This will push back our completion date from March 15th to March 29th.

We can either:
1. Wait for your tiles (recommended)
2. Use similar tiles from local supplier (+$300)

Let me know how you'd like to proceed.

Mike`
  },

  'material-substitute': {
    subject: 'Flooring Material Substitution',
    body: `Hi Sarah,

The oak flooring you selected is currently backordered. I found a very similar maple option that's in stock and actually $500 less expensive.

Attached are photos and specs for your review. Quality is comparable and installation timeline stays the same.

Let me know if this works for you.

Best,
Mike`,
    attachments: ['flooring-specs.pdf']
  },

  'urgent-issue': {
    subject: 'URGENT: Kitchen Water Leak',
    body: `Hi Sarah,

We have a water leak in the kitchen that needs immediate attention. I've shut off the main water valve as a precaution.

This was caused by the old pipe we discussed yesterday. We need to fix this before we can continue with any other work.

Please call me ASAP at (555) 123-4567.

Mike Johnson
Johnson Construction`
  },

  'invoice': {
    subject: 'Kitchen Renovation - Invoice #1234',
    body: `Hi Sarah,

Please find attached the invoice for this week's work on your kitchen renovation.

Work completed:
- Demolition of old cabinets
- Electrical rough-in
- Plumbing rough-in

Total: $3,500.00

Payment due within 30 days.

Thanks,
Mike Johnson
Johnson Construction`,
    attachments: ['invoice-1234.pdf']
  }
};

class EmailSender {
  private oauth: EmailTestOAuth;

  constructor() {
    this.oauth = new EmailTestOAuth();
  }

  /**
   * Send a test email from contractor to homeowner
   */
  async sendTestEmail(templateName: string, customSubject?: string, customBody?: string): Promise<void> {
    const template = EMAIL_TEMPLATES[templateName];
    if (!template && !customSubject && !customBody) {
      throw new Error(`Unknown template: ${templateName}. Available: ${Object.keys(EMAIL_TEMPLATES).join(', ')}`);
    }

    const subject = customSubject || template?.subject || 'Test Email';
    const body = customBody || template?.body || 'This is a test email';

    console.log(`📧 Sending email: ${subject}`);

    try {
      const gmail = this.oauth.getGmailClient('contractor');
      
      const email = this.createEmailMessage(
        'nailit.test.contractor@gmail.com',
        'nailit.test.homeowner@gmail.com',
        subject,
        body
      );

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: email
        }
      });

      console.log(`✅ Email sent successfully! Message ID: ${response.data.id}`);
      console.log(`📬 Check nailit.test.homeowner@gmail.com inbox`);

    } catch (error: any) {
      console.error(`❌ Failed to send email:`, error.message);
      throw error;
    }
  }

  /**
   * Send bulk historical emails for testing
   */
  async sendBulkEmails(count: number, daysBack: number): Promise<void> {
    console.log(`📧 Sending ${count} historical emails over ${daysBack} days`);

    const templates = Object.keys(EMAIL_TEMPLATES);
    const now = new Date();

    for (let i = 0; i < count; i++) {
      // Pick random template
      const templateName = templates[Math.floor(Math.random() * templates.length)];
      const template = EMAIL_TEMPLATES[templateName];

      // Calculate random date in the past
      const daysAgo = Math.floor(Math.random() * daysBack);
      const sendDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));

      const subject = `[${sendDate.toISOString().split('T')[0]}] ${template.subject}`;
      
      try {
        await this.sendTestEmail(templateName, subject);
        console.log(`✅ Sent ${i + 1}/${count}: ${subject}`);
        
        // Small delay to avoid rate limiting
        await this.delay(1000);
      } catch (error: any) {
        console.error(`❌ Failed to send email ${i + 1}:`, error.message);
      }
    }

    console.log(`✅ Bulk email sending complete`);
  }

  /**
   * Create email message in base64 format
   */
  private createEmailMessage(from: string, to: string, subject: string, body: string): string {
    const email = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      ``,
      body
    ].join('\n');

    return Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
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
    console.log(`\n📧 Email Sender for Testing\n`);
    console.log(`Usage:`);
    console.log(`  npm run test:send-email <template_name>`);
    console.log(`  npm run test:send-bulk-emails <count> <days_back>`);
    console.log(`\nAvailable templates:`);
    Object.keys(EMAIL_TEMPLATES).forEach(template => {
      console.log(`  - ${template}`);
    });
    console.log(`\nExamples:`);
    console.log(`  npm run test:send-email cost-change`);
    console.log(`  npm run test:send-email urgent-issue`);
    console.log(`  npm run test:send-bulk-emails 50 30`);
    return;
  }

  const sender = new EmailSender();

  try {
    switch (command) {
      case 'single':
        const templateName = args[1];
        if (!templateName) {
          console.error(`❌ Template name required`);
          process.exit(1);
        }
        await sender.sendTestEmail(templateName);
        break;

      case 'bulk':
        const count = parseInt(args[1]) || 10;
        const daysBack = parseInt(args[2]) || 30;
        await sender.sendBulkEmails(count, daysBack);
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

export { EmailSender };
