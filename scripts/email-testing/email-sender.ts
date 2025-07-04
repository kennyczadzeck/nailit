#!/usr/bin/env ts-node

import { config } from 'dotenv';
config({ path: '.env.local' });
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
  },

  // HOMEOWNER REPLY TEMPLATES (NEW)
  'homeowner-cost-approval': {
    subject: 'Re: Kitchen Renovation - Cost Update Required',
    body: `Hi Mike,

Thanks for letting me know about the plumbing issues. I'd definitely like to see the damage tomorrow - how about 2 PM?

The additional $2,800 is within our contingency budget, so please go ahead with the work. Better to fix it properly now than have problems later.

Will this affect any other parts of the timeline besides the 3 days you mentioned?

Thanks,
Sarah`
  },

  'homeowner-schedule-concern': {
    subject: 'Re: Bathroom Remodel - Schedule Update', 
    body: `Hi Mike,

A 2-week delay is really concerning since we have family visiting March 30th. 

Can you tell me more about the local supplier option? I'm willing to consider it if the quality is close. Can you send me photos/samples to compare?

Also, if we go with the local tiles, would that actually get us back on the original March 15th timeline?

Let's discuss options,
Sarah`
  },

  'homeowner-material-questions': {
    subject: 'Re: Flooring Material Substitution',
    body: `Hi Mike,

The maple flooring looks good in the photos - thanks for finding an alternative! I have a few questions:

1. Is the warranty the same as the oak flooring?
2. Will it match the existing wood trim in the living room?
3. Can I get a small sample to see it in person?

The $500 savings is nice, but I want to make sure it's the right choice long-term.

Let me know when I can see a sample.

Sarah`
  },

  'homeowner-urgent-response': {
    subject: 'Re: URGENT: Kitchen Water Leak',
    body: `Mike,

Just saw your message - yes, please go ahead and do whatever you need to fix the water leak immediately. I trust your judgment.

I'm at work but can be there by 4 PM if you need me to see anything or sign off on additional work.

Thanks for catching this quickly!

Sarah
(555) 987-6543`
  },

  'homeowner-invoice-question': {
    subject: 'Re: Kitchen Renovation - Invoice #1234',
    body: `Hi Mike,

Thanks for the invoice. I have a quick question about the electrical rough-in cost - it seems higher than the original estimate. Can you help me understand what was different?

Also, I noticed some dust got on the dining room furniture. Can your team cover furniture in the adjacent rooms going forward?

Payment will be sent by Friday.

Best,
Sarah`
  },

  'homeowner-progress-check': {
    subject: 'Kitchen Renovation - Quick Check-in',
    body: `Hi Mike,

Hope the week is going well! I wanted to check on progress since I've been traveling.

How are we tracking against the timeline? Any issues or changes I should know about?

Also, when would be a good time to discuss the cabinet hardware selection? I have some ideas but want to make sure the timing works with your schedule.

Thanks,
Sarah`
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
   * Send a homeowner reply email (NEW - for bidirectional conversations)
   */
  async sendHomeownerReply(templateName: string, customSubject?: string, customBody?: string): Promise<void> {
    const template = EMAIL_TEMPLATES[templateName];
    if (!template && !customSubject && !customBody) {
      throw new Error(`Unknown homeowner template: ${templateName}`);
    }

    const subject = customSubject || template?.subject || 'Homeowner Reply';
    const body = customBody || template?.body || 'This is a homeowner reply';

    console.log(`📧 Sending homeowner reply: ${subject}`);

    try {
      const gmail = this.oauth.getGmailClient('homeowner');
      
      const email = this.createEmailMessage(
        'nailit.test.homeowner@gmail.com',
        'nailit.test.contractor@gmail.com',
        subject,
        body
      );

      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: email
        }
      });

      console.log(`✅ Homeowner reply sent successfully! Message ID: ${response.data.id}`);
      console.log(`📬 Check nailit.test.contractor@gmail.com inbox`);

    } catch (error: any) {
      console.error(`❌ Failed to send homeowner reply:`, error.message);
      throw error;
    }
  }

  /**
   * Generate realistic conversation threads for historical testing (NEW)
   */
  async generateConversationThreads(threadCount: number, daysBack: number): Promise<void> {
    console.log(`💬 Generating ${threadCount} conversation threads over ${daysBack} days`);

    const conversationPairs = [
      { contractor: 'cost-change', homeowner: 'homeowner-cost-approval' },
      { contractor: 'schedule-delay', homeowner: 'homeowner-schedule-concern' },
      { contractor: 'material-substitute', homeowner: 'homeowner-material-questions' },
      { contractor: 'urgent-issue', homeowner: 'homeowner-urgent-response' },
      { contractor: 'invoice', homeowner: 'homeowner-invoice-question' }
    ];

    const now = new Date();

    for (let i = 0; i < threadCount; i++) {
      // Pick random conversation pair
      const pair = conversationPairs[Math.floor(Math.random() * conversationPairs.length)];
      
      // Calculate random date in the past
      const daysAgo = Math.floor(Math.random() * daysBack);
      const initialDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      const replyDate = new Date(initialDate.getTime() + (Math.random() * 48 * 60 * 60 * 1000)); // Reply within 48 hours

      try {
        // Send contractor email first
        const contractorTemplate = EMAIL_TEMPLATES[pair.contractor];
        const contractorSubject = `[${initialDate.toISOString().split('T')[0]}] ${contractorTemplate.subject}`;
        
        await this.sendTestEmail(pair.contractor, contractorSubject);
        console.log(`✅ Thread ${i + 1}/${threadCount} - Contractor: ${contractorSubject}`);
        
        // Wait a bit before sending reply
        await this.delay(2000);
        
        // Send homeowner reply
        const homeownerTemplate = EMAIL_TEMPLATES[pair.homeowner];
        const homeownerSubject = `[${replyDate.toISOString().split('T')[0]}] ${homeownerTemplate.subject}`;
        
        await this.sendHomeownerReply(pair.homeowner, homeownerSubject);
        console.log(`✅ Thread ${i + 1}/${threadCount} - Homeowner: ${homeownerSubject}`);
        
        // Add some homeowner-initiated emails too (25% chance)
        if (Math.random() < 0.25) {
          await this.delay(1000);
          const checkInDate = new Date(replyDate.getTime() + (Math.random() * 120 * 60 * 60 * 1000)); // 0-5 days later
          const checkInSubject = `[${checkInDate.toISOString().split('T')[0]}] Kitchen Renovation - Quick Check-in`;
          await this.sendHomeownerReply('homeowner-progress-check', checkInSubject);
          console.log(`✅ Thread ${i + 1}/${threadCount} - Homeowner initiated: Check-in`);
        }
        
        // Delay between threads to avoid rate limiting
        await this.delay(3000);
        
      } catch (error: any) {
        console.error(`❌ Failed to send conversation thread ${i + 1}:`, error.message);
      }
    }

    console.log(`✅ Conversation thread generation complete`);
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
    console.log(`  npm run test:send-conversations <thread_count> <days_back>`);
    console.log(`  npm run test:send-homeowner-reply <template_name>`);
    console.log(`\nAvailable contractor templates:`);
    Object.keys(EMAIL_TEMPLATES).filter(t => !t.startsWith('homeowner-')).forEach(template => {
      console.log(`  - ${template}`);
    });
    console.log(`\nAvailable homeowner reply templates:`);
    Object.keys(EMAIL_TEMPLATES).filter(t => t.startsWith('homeowner-')).forEach(template => {
      console.log(`  - ${template}`);
    });
    console.log(`\nExamples:`);
    console.log(`  npm run test:send-email cost-change`);
    console.log(`  npm run test:send-homeowner-reply homeowner-cost-approval`);
    console.log(`  npm run test:send-bulk-emails 50 30`);
    console.log(`  npm run test:send-conversations 15 90  # 15 conversation threads over 90 days`);
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

      case 'conversation':
        const threadCount = parseInt(args[1]) || 10;
        const conversationDaysBack = parseInt(args[2]) || 90;
        await sender.generateConversationThreads(threadCount, conversationDaysBack);
        break;

      case 'homeowner-reply':
        const homeownerTemplate = args[1];
        if (!homeownerTemplate) {
          console.error(`❌ Homeowner template name required`);
          process.exit(1);
        }
        await sender.sendHomeownerReply(homeownerTemplate);
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
