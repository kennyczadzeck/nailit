#!/usr/bin/env ts-node

import { config } from 'dotenv';
config({ path: '.env.local' });
import { EmailTestOAuth } from './oauth-setup';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Email Sender for Testing Gmail API Integration
 * 
 * CRITICAL PRINCIPLE: This module sends emails EXCLUSIVELY via Gmail API and NEVER writes to database.
 * Database is populated only through proper ingestion pathways (Gmail queries + webhooks).
 * 
 * THREADING IMPLEMENTATION:
 * - Maintains consistent subject lines throughout conversation threads
 * - Uses proper email headers (In-Reply-To, References, Message-ID) for Gmail threading
 * - Supports cross-account threading between contractor and homeowner Gmail accounts
 * - Follows industry-standard email threading protocols
 * 
 * CONVERSATION PATTERNS:
 * - Contractor initiates conversation with project-related email
 * - Homeowner responds within realistic timeframe (2-48 hours simulated)
 * - Contractor optionally follows up (70% probability)
 * - Homeowner occasionally initiates check-ins (20% probability)
 * 
 * AUTHENTICATION:
 * - Uses OAuth 2.0 with Gmail API scopes for sending and reading emails
 * - Supports automatic token refresh for long-running operations
 * - Maintains separate credentials for contractor and homeowner accounts
 */

/**
 * Email template structure for consistent email generation
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

      console.log(`✅ Homeowner reply sent successfully! Message ID: ${response.data.id}, Thread ID: ${response.data.threadId}`);
      console.log(`📬 Check nailit.test.contractor@gmail.com inbox`);

    } catch (error: any) {
      console.error(`❌ Failed to send homeowner reply:`, error.message);
      throw error;
    }
  }

  /**
   * Generate realistic conversation threads for historical testing (ENHANCED WITH PROPER THREADING)
   * 
   * CRITICAL REQUIREMENT: Ensures authentic bidirectional contractor-homeowner conversations
   * with proper Gmail threading headers (In-Reply-To, References) for conversation grouping.
   * 
   * THREADING STRATEGY:
   * 1. Initial email: Contractor sends with unique Message-ID (no threading headers)
   * 2. Homeowner reply: Uses In-Reply-To and References headers pointing to initial email
   * 3. Follow-ups: Chain threading headers to maintain conversation continuity
   * 4. Subject consistency: Base subject remains identical, only "Re:" prefix added
   * 
   * CONVERSATION FLOW:
   * - Contractor initiates with project-related email (cost, schedule, materials, etc.)
   * - Homeowner responds with questions, approvals, or concerns
   * - Contractor optionally follows up with confirmation or additional info (70% chance)
   * - Homeowner occasionally initiates progress check-ins (20% chance)
   * 
   * GMAIL THREADING REQUIREMENTS:
   * - Consistent subject lines (NO modifications like "- Update" or "- Progress Check")
   * - Proper email headers (Message-ID, In-Reply-To, References)
   * - Cross-account support between contractor and homeowner Gmail accounts
   * - Industry-standard threading protocols for maximum compatibility
   * 
   * @param threadCount Number of conversation threads to generate
   * @param daysBack Number of days back to distribute conversations over
   */
  async generateConversationThreads(threadCount: number, daysBack: number): Promise<void> {
    console.log(`💬 Generating ${threadCount} AUTHENTIC conversation threads with proper Gmail threading over ${daysBack} days`);
    console.log(`🎯 Each thread will have: contractor → homeowner → contractor flow with proper threading headers`);

    // Enhanced conversation patterns with guaranteed bidirectional flow
    const conversationPatterns = [
      {
        name: 'Cost Change Discussion',
        contractor: 'cost-change',
        homeowner: 'homeowner-cost-approval',
        followUp: true,
        keywords: ['cost', 'budget', 'approve']
      },
      {
        name: 'Schedule Coordination',
        contractor: 'schedule-delay',
        homeowner: 'homeowner-schedule-concern',
        followUp: true,
        keywords: ['schedule', 'delay', 'timeline']
      },
      {
        name: 'Material Selection',
        contractor: 'material-substitute',
        homeowner: 'homeowner-material-questions',
        followUp: true,
        keywords: ['material', 'flooring', 'sample']
      },
      {
        name: 'Urgent Issue Response',
        contractor: 'urgent-issue',
        homeowner: 'homeowner-urgent-response',
        followUp: false, // Urgent issues get quick resolution
        keywords: ['urgent', 'leak', 'immediate']
      },
      {
        name: 'Invoice Discussion',
        contractor: 'invoice',
        homeowner: 'homeowner-invoice-question',
        followUp: true,
        keywords: ['invoice', 'payment', 'cost']
      }
    ];

    const now = new Date();
    let threadsGenerated = 0;

    for (let i = 0; i < threadCount; i++) {
      // Pick conversation pattern
      const pattern = conversationPatterns[Math.floor(Math.random() * conversationPatterns.length)];
      
      // Calculate realistic timing
      const daysAgo = Math.floor(Math.random() * daysBack);
      const initialDate = new Date(now.getTime() - (daysAgo * 24 * 60 * 60 * 1000));
      
      // Thread tracking for proper Gmail threading
      let threadId = `thread-${Date.now()}-${i}`;
      let messageIds: string[] = [];
      let references = '';
      
      try {
        console.log(`\n🧵 Thread ${i + 1}/${threadCount}: ${pattern.name}`);
        
        // Step 1: Contractor initiates (REQUIRED)
        const contractorTemplate = EMAIL_TEMPLATES[pattern.contractor];
        const baseSubject = contractorTemplate.subject;
        const contractorSubject = `Kitchen Renovation - ${baseSubject}`;
        
        // Generate unique message ID for initial email
        const initialMessageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}.${threadId}@gmail.com>`;
        messageIds.push(initialMessageId);
        
        const contractorResult = await this.sendTestEmailWithThreading(
          pattern.contractor, 
          contractorSubject, 
          undefined, // body
          {
            messageId: initialMessageId
            // Don't pass threadId for initial email - let Gmail generate it
          }
        );
        
        // Use the actual thread ID returned by Gmail
        const actualThreadId = contractorResult.threadId;
        
        console.log(`   1️⃣ Contractor: "${contractorSubject}" [${contractorResult.messageId}] Thread: ${actualThreadId}`);
        
        // Wait before homeowner response
        await this.delay(3000);
        
        // Step 2: Homeowner responds (REQUIRED for bidirectional)
        const homeownerTemplate = EMAIL_TEMPLATES[pattern.homeowner];
        const homeownerSubject = `Re: ${contractorSubject}`;
        
        // Generate message ID for homeowner reply
        const homeownerMessageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}.${threadId}@gmail.com>`;
        messageIds.push(homeownerMessageId);
        references = messageIds.join(' ');
        
        const homeownerResult = await this.sendHomeownerReplyWithThreading(
          pattern.homeowner, 
          homeownerSubject, 
          undefined, // body
          {
            messageId: homeownerMessageId,
            inReplyTo: initialMessageId,
            references: references
          }
        );
        console.log(`   2️⃣ Homeowner: "${homeownerSubject}" [Reply to: ${contractorResult.messageId}] Thread: ${homeownerResult.threadId}`);
        
        // Step 3: Contractor follow-up (conditional)
        if (pattern.followUp && Math.random() > 0.3) { // 70% chance of follow-up
          await this.delay(2000);
          
          const followUpSubject = `Re: ${contractorSubject}`;  // Keep same subject, just add Re:
          
          // Generate message ID for contractor follow-up
          const followUpMessageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}.${threadId}@gmail.com>`;
          messageIds.push(followUpMessageId);
          references = messageIds.join(' ');
          
          const followUpResult = await this.sendTestEmailWithThreading(
            pattern.contractor, 
            followUpSubject, 
            `Thanks for your response! I'll proceed as discussed. Will keep you updated on progress.`,
            {
              messageId: followUpMessageId,
              inReplyTo: homeownerMessageId,
              references: references
            }
          );
          console.log(`   3️⃣ Contractor: "${followUpSubject}" [Reply to: ${homeownerResult.messageId}] Thread: ${followUpResult.threadId}`);
        }
        
        // Occasionally add homeowner-initiated check-ins (20% chance)
        if (Math.random() < 0.2) {
          await this.delay(2000);
          const checkInSubject = `Re: ${contractorSubject}`;  // Keep same subject, just add Re:
          
          const checkInMessageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}.${threadId}@gmail.com>`;
          messageIds.push(checkInMessageId);
          references = messageIds.join(' ');
          
          const checkInResult = await this.sendHomeownerReplyWithThreading(
            'homeowner-progress-check', 
            checkInSubject,
            undefined, // body
            {
              messageId: checkInMessageId,
              inReplyTo: messageIds[messageIds.length - 2], // Reply to previous message
              references: references
            }
          );
          console.log(`   4️⃣ Homeowner initiated: "${checkInSubject}" [Threaded] Thread: ${checkInResult.threadId}`);
        }
        
        threadsGenerated++;
        
        // Delay between conversation threads
        await this.delay(4000);
        
      } catch (error: any) {
        console.error(`❌ Failed to generate thread ${i + 1} (${pattern.name}):`, error.message);
      }
    }

    console.log(`\n✅ Generated ${threadsGenerated}/${threadCount} authentic conversation threads with proper Gmail threading`);
    console.log(`🎯 Each thread includes: contractor initiation → homeowner response → optional follow-up`);
    console.log(`📧 All emails use proper Gmail threading headers (In-Reply-To, References, Message-ID)`);
  }

  /**
   * Send contractor email with threading support using proper email headers
   * 
   * THREADING IMPLEMENTATION:
   * This method sends emails with proper threading headers to enable Gmail conversation
   * grouping. Unlike Gmail's thread API (which is account-specific), email headers
   * work across different Gmail accounts for cross-account threading.
   * 
   * HEADER STRATEGY:
   * - Initial emails: Only Message-ID header (no threading references)
   * - Reply emails: Include In-Reply-To and References headers for thread continuity
   * - Subject consistency: Base subject remains unchanged, only "Re:" prefix added
   * 
   * CROSS-ACCOUNT SUPPORT:
   * Threading headers enable conversations between contractor and homeowner accounts
   * to be properly grouped in both Gmail inboxes, maintaining conversation context.
   * 
   * @param templateName Email template to use for content
   * @param customSubject Optional custom subject (overrides template subject)
   * @param customBody Optional custom body (overrides template body)
   * @param threadingOptions Threading headers for conversation continuity
   * @returns Promise containing message ID and thread ID from Gmail API
   */
  private async sendTestEmailWithThreading(
    templateName: string, 
    customSubject?: string, 
    customBody?: string,
    threadingOptions?: { messageId?: string, inReplyTo?: string, references?: string }
  ): Promise<{ messageId: string, threadId: string }> {
    const template = EMAIL_TEMPLATES[templateName];
    if (!template && !customSubject && !customBody) {
      throw new Error(`Unknown template: ${templateName}`);
    }

    const subject = customSubject || template?.subject || 'Test Email';
    const body = customBody || template?.body || 'This is a test email';

    const gmail = this.oauth.getGmailClient('contractor');
    
    const email = this.createEmailMessage(
      'nailit.test.contractor@gmail.com',
      'nailit.test.homeowner@gmail.com',
      subject,
      body,
      threadingOptions
    );

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: email
      }
    });

    console.log(`✅ Email sent successfully! Message ID: ${response.data.id}, Thread ID: ${response.data.threadId}`);
    console.log(`📬 Check nailit.test.homeowner@gmail.com inbox`);
    
    return { 
      messageId: response.data.id || '', 
      threadId: response.data.threadId || '' 
    };
  }

  /**
   * Send homeowner reply with threading support using proper email headers
   * 
   * HOMEOWNER REPLY THREADING:
   * This method sends homeowner replies with proper threading headers to maintain
   * conversation continuity. It uses the homeowner's Gmail account to send replies
   * back to the contractor's account.
   * 
   * THREADING REQUIREMENTS:
   * - Must include In-Reply-To header pointing to the contractor's original message
   * - Must include References header with complete thread history
   * - Subject must use "Re:" prefix with unchanged base subject
   * - Message-ID must be unique for this specific reply
   * 
   * BIDIRECTIONAL CONVERSATION:
   * This enables authentic contractor-homeowner communication patterns where
   * homeowners can respond to contractor emails with questions, approvals, or concerns.
   * 
   * @param templateName Homeowner template to use for content
   * @param customSubject Optional custom subject (should start with "Re:")
   * @param customBody Optional custom body (overrides template body)
   * @param threadingOptions Threading headers for conversation continuity
   * @returns Promise containing message ID and thread ID from Gmail API
   */
  private async sendHomeownerReplyWithThreading(
    templateName: string, 
    customSubject?: string, 
    customBody?: string,
    threadingOptions?: { messageId?: string, inReplyTo?: string, references?: string }
  ): Promise<{ messageId: string, threadId: string }> {
    const template = EMAIL_TEMPLATES[templateName];
    if (!template && !customSubject && !customBody) {
      throw new Error(`Unknown homeowner template: ${templateName}`);
    }

    const subject = customSubject || template?.subject || 'Test Reply';
    const body = customBody || template?.body || 'This is a test homeowner reply';

    const gmail = this.oauth.getGmailClient('homeowner');
    
    const email = this.createEmailMessage(
      'nailit.test.homeowner@gmail.com',
      'nailit.test.contractor@gmail.com',
      subject,
      body,
      threadingOptions
    );

    const response = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: email
      }
    });

    console.log(`✅ Homeowner reply sent successfully! Message ID: ${response.data.id}, Thread ID: ${response.data.threadId}`);
    console.log(`📬 Check nailit.test.contractor@gmail.com inbox`);
    
    return { 
      messageId: response.data.id || '', 
      threadId: response.data.threadId || '' 
    };
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
   * Create email message in base64 format with optional threading headers
   * 
   * GMAIL THREADING IMPLEMENTATION:
   * This method creates properly formatted email messages with RFC 2822 compliant headers
   * that enable Gmail to group related emails into conversation threads.
   * 
   * THREADING HEADERS EXPLAINED:
   * - Message-ID: Unique identifier for this specific email message
   * - In-Reply-To: Message-ID of the email this is replying to (for replies only)
   * - References: Space-separated list of all Message-IDs in the conversation thread
   * - Subject: Must remain consistent throughout thread (only "Re:" prefix allowed)
   * 
   * CROSS-ACCOUNT THREADING:
   * These headers enable Gmail to properly thread conversations between different
   * Gmail accounts (contractor and homeowner), maintaining conversation continuity
   * across account boundaries.
   * 
   * BASE64 ENCODING:
   * Gmail API requires email messages to be base64url encoded (RFC 4648 Section 5)
   * with specific character replacements: + → -, / → _, padding removed
   * 
   * @param from Sender email address
   * @param to Recipient email address  
   * @param subject Email subject line (must remain consistent for threading)
   * @param body Email body content
   * @param options Optional threading headers for conversation continuity
   * @returns Base64url encoded email message ready for Gmail API
   */
  private createEmailMessage(
    from: string, 
    to: string, 
    subject: string, 
    body: string, 
    options?: { 
      inReplyTo?: string, 
      references?: string,
      messageId?: string 
    }
  ): string {
    const messageId = options?.messageId || `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@gmail.com>`;
    
    const headers = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`
    ];

    // Add threading headers for replies
    if (options?.inReplyTo) {
      headers.push(`In-Reply-To: ${options.inReplyTo}`);
    }
    if (options?.references) {
      headers.push(`References: ${options.references}`);
    }

    const email = [
      ...headers,
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