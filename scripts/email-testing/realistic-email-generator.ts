#!/usr/bin/env ts-node

import { config } from 'dotenv';
config({ path: '.env.local' });
import { EmailTestOAuth } from './oauth-setup';

/**
 * Realistic Email Generator for Testing
 * 
 * CRITICAL ARCHITECTURAL PRINCIPLES:
 * 
 * 1. HOMEOWNER-ONLY INGESTION:
 *    - This script ONLY sends emails via Gmail API
 *    - It NEVER writes to the database directly
 *    - Database should ONLY be populated through proper ingestion pathways:
 *      * Gmail API queries (for historical email discovery)
 *      * Webhooks (for real-time email processing)
 * 
 * 2. HOMEOWNER-CENTRIC EMAIL FLOW:
 *    - Contractors send emails TO homeowner via Gmail API
 *    - Homeowner receives all project communications in their Gmail
 *    - Nailit ingests emails FROM homeowner's Gmail account only
 *    - Complete conversation history captured through homeowner's perspective
 * 
 * 3. EMAIL GENERATION PATTERN:
 *    - Use contractor Gmail to SEND emails TO homeowner
 *    - Use homeowner Gmail to SEND replies TO contractor
 *    - Never access contractor Gmail for ingestion
 *    - Always test ingestion from homeowner's Gmail only
 * 
 * This ensures we test the actual email ingestion pathways used in production.
 * 
 * NEVER MODIFY THIS TO WRITE TO DATABASE DIRECTLY
 */

interface EmailTemplate {
  subject: string;
  body: string;
  attachments?: string[];
  isReply?: boolean;
  replyToSubject?: string;
}

interface ConversationThread {
  initialEmail: EmailTemplate;
  replies: EmailTemplate[];
  threadSubject: string;
  daysSpread: number; // How many days this conversation spans
}

// Realistic conversation threads for a kitchen renovation project
const CONVERSATION_THREADS: ConversationThread[] = [
  {
    threadSubject: "Kitchen Renovation - Initial Quote and Timeline",
    daysSpread: 5,
    initialEmail: {
      subject: "Kitchen Renovation - Initial Quote and Timeline",
      body: `Hi Sarah,

Thank you for choosing Johnson Construction for your kitchen renovation project. I've put together a comprehensive quote based on our site visit and your requirements.

**Project Overview:**
- Complete kitchen renovation including cabinets, countertops, appliances, flooring
- Timeline: 6-8 weeks starting January 15th
- Total investment: $47,500

**What's Included:**
- Demo of existing kitchen
- New custom cabinets with soft-close hinges
- Quartz countertops with undermount sink
- Luxury vinyl plank flooring
- Electrical and plumbing updates to code
- Paint and finishing work

I've attached the detailed quote with material specifications and timeline breakdown. Please review and let me know if you have any questions.

Looking forward to transforming your kitchen!

Best regards,
Mike Johnson
Johnson Construction
(555) 123-4567
mike@johnsonconstructionpro.com`,
      attachments: ['kitchen-renovation-quote.pdf']
    },
    replies: [
      {
        subject: "Re: Kitchen Renovation - Initial Quote and Timeline",
        body: `Hi Mike,

Thanks for the detailed quote! I've reviewed everything with my husband and we're excited to move forward.

A few quick questions:
1. Can we upgrade the cabinet hardware to brushed brass? What would be the additional cost?
2. Is there flexibility on the start date? We're hoping to begin February 1st instead of January 15th.
3. The quartz countertop - can we see samples of the colors you mentioned?

Also, what's the payment schedule? Do you require a deposit to secure the February start date?

Thanks!
Sarah`,
        isReply: true,
        replyToSubject: "Kitchen Renovation - Initial Quote and Timeline"
      },
      {
        subject: "Re: Kitchen Renovation - Initial Quote and Timeline",
        body: `Hi Sarah,

Great questions! Here are the details:

**1. Cabinet Hardware Upgrade:**
- Brushed brass upgrade: +$850 (includes handles, hinges, and drawer pulls)
- I can show you samples when I drop off the countertop samples

**2. Start Date:**
- February 1st works perfectly! Actually better for our schedule
- I'll update the timeline and send revised schedule

**3. Countertop Samples:**
- I'll bring 4 quartz samples tomorrow around 2 PM if that works
- Colors: Arctic White, Calacatta Gold, Concrete Gray, and Carrara Mist

**Payment Schedule:**
- $5,000 deposit to secure start date and order materials
- 25% at project start
- 50% at halfway point (cabinets installed)
- Final 25% at completion

Let me know about tomorrow at 2 PM for the samples!

Mike`,
        isReply: true,
        replyToSubject: "Kitchen Renovation - Initial Quote and Timeline"
      }
    ]
  },
  {
    threadSubject: "URGENT: Plumbing Issue Discovered",
    daysSpread: 2,
    initialEmail: {
      subject: "URGENT: Plumbing Issue Discovered",
      body: `Hi Sarah,

I need to discuss an urgent issue we discovered during demo this morning.

**The Situation:**
Behind your sink wall, we found significant water damage and outdated plumbing that needs immediate attention. The pipes are corroded and there's evidence of a slow leak that's been going on for months.

**What We Need to Do:**
- Replace all supply lines to the kitchen
- Repair water damage to subfloor and wall framing
- Update plumbing to current code requirements

**Cost Impact:**
- Additional materials and labor: $3,200
- Timeline impact: +4 days to our schedule

**Immediate Action:**
I've shut off water to the kitchen area as a safety precaution. We need your approval to proceed with the repairs before we can continue with any other work.

This wasn't visible during our initial inspection, but it's critical we address it now. The good news is we caught it before it became a major problem!

Can you call me today? I'm available until 6 PM.

Mike Johnson
(555) 123-4567`,
      attachments: ['plumbing-damage-photos.pdf']
    },
    replies: [
      {
        subject: "Re: URGENT: Plumbing Issue Discovered",
        body: `Hi Mike,

Thanks for catching this! I'd rather fix it properly now than have bigger problems later.

Please go ahead with the plumbing repairs. The $3,200 is within our contingency budget, and the 4-day delay is manageable.

A couple of questions:
1. Will this affect the electrical work timeline too?
2. Do you need me to be there to see the damage, or do the photos show everything?
3. Will the new plumbing be more reliable/better than what was there?

Thanks for being proactive about this. I trust your judgment completely.

Sarah
(555) 987-6543`,
        isReply: true,
        replyToSubject: "URGENT: Plumbing Issue Discovered"
      },
      {
        subject: "Re: URGENT: Plumbing Issue Discovered",
        body: `Hi Sarah,

Perfect! I'll get the plumbing crew scheduled for tomorrow morning.

**Your Questions:**
1. **Electrical timeline:** No impact - we can run electrical while plumbing work happens
2. **Viewing damage:** Photos show it all, but you're welcome to see it in person if you want
3. **New plumbing:** Absolutely! New PEX lines with 25-year warranty vs. 40-year-old copper that was failing

**Next Steps:**
- Plumbing crew starts tomorrow (Wednesday) at 8 AM
- Materials ordered and will arrive Thursday
- Back on regular schedule by Monday

I'll send updated timeline and change order paperwork tonight.

Thanks for the quick decision!

Mike`,
        isReply: true,
        replyToSubject: "URGENT: Plumbing Issue Discovered"
      }
    ]
  },
  {
    threadSubject: "Cabinet Installation Update",
    daysSpread: 3,
    initialEmail: {
      subject: "Cabinet Installation Update",
      body: `Hi Sarah,

Great progress this week! The cabinet installation is going smoothly and we're actually ahead of schedule.

**This Week's Progress:**
- All base cabinets installed and leveled
- Upper cabinets going in tomorrow
- Countertop template scheduled for Friday
- Plumbing rough-in completed and inspected

**Next Week's Schedule:**
- Monday: Countertop installation
- Tuesday-Wednesday: Backsplash tile work  
- Thursday: Appliance delivery and installation
- Friday: Final electrical connections

**Quick Question:**
The electrician noticed your current outlet layout won't work optimally with the new island. We can add two more outlets for $180 - would you like me to include this? It'll make the island much more functional for small appliances.

Everything looks fantastic! Can't wait for you to see it coming together.

Mike`,
      attachments: ['cabinet-progress-photos.pdf']
    },
    replies: [
      {
        subject: "Re: Cabinet Installation Update",
        body: `Hi Mike,

This is so exciting! I can't wait to see the progress.

Yes, please add the additional outlets to the island - $180 is definitely worth it for the functionality. Better to do it now than regret it later.

A couple of questions about next week:
1. What time Monday for countertops? I'd like to be there to see the installation
2. For the backsplash - we picked the subway tile, right? Just want to confirm
3. Will the appliances be fully functional by Friday, or is there additional work after that?

Thanks for staying ahead of schedule! This is exactly why we chose your team.

Sarah`,
        isReply: true,
        replyToSubject: "Cabinet Installation Update"
      },
      {
        subject: "Re: Cabinet Installation Update",
        body: `Hi Sarah,

Perfect! I'll add the island outlets to tomorrow's electrical work.

**Your Questions:**
1. **Countertop timing:** Monday 9 AM - installation takes about 4 hours, perfect time to watch!
2. **Backsplash:** Yes, 3x6 white subway tile with dark grout - looks amazing with your cabinets
3. **Appliances:** Fully functional Friday evening! You'll be cooking in your new kitchen this weekend!

**Bonus Update:**
The cabinet hardware came in and it looks incredible. The brushed brass was the perfect choice - really makes the white cabinets pop.

See you Monday morning!

Mike`,
        isReply: true,
        replyToSubject: "Cabinet Installation Update"
      }
    ]
  },
  {
    threadSubject: "Final Invoice and Project Completion",
    daysSpread: 1,
    initialEmail: {
      subject: "Final Invoice and Project Completion",
      body: `Hi Sarah,

I can't believe how amazing your kitchen turned out! It was a pleasure working with you and your family on this project.

**Project Summary:**
- Original timeline: 6-8 weeks
- Actual completion: 7 weeks (including the plumbing discovery)
- Final cost: $50,700 (original $47,500 + plumbing $3,200)

**What We Accomplished:**
✅ Complete kitchen renovation
✅ Upgraded plumbing system
✅ Additional island outlets
✅ Brushed brass hardware upgrade
✅ All work passed inspections
✅ 2-year warranty on all workmanship

**Final Invoice:**
Please find attached the final invoice for $2,500 (remaining balance). This covers the final electrical connections, cleanup, and touch-up work completed this week.

**Next Steps:**
- Final walkthrough scheduled for tomorrow at 10 AM
- All warranty documentation will be provided
- Please don't hesitate to call if you have any questions

Thank you for choosing Johnson Construction. Enjoy your beautiful new kitchen!

Best regards,
Mike Johnson`,
      attachments: ['final-invoice.pdf', 'warranty-documentation.pdf']
    },
    replies: [
      {
        subject: "Re: Final Invoice and Project Completion",
        body: `Hi Mike,

We absolutely LOVE the kitchen! You and your team exceeded our expectations in every way.

The attention to detail, communication throughout the project, and quality of work was outstanding. We're already getting compliments from neighbors who've seen it.

Payment for the final invoice will be sent today. 

Would you be available for a quick photo session next week? We'd love to get some professional photos for our records, and I know you like to showcase your work too.

Thank you again for making this such a positive experience. We'll definitely be calling you for the bathroom renovation we're planning for next year!

Sarah & Tom`,
        isReply: true,
        replyToSubject: "Final Invoice and Project Completion"
      }
    ]
  },
  {
    threadSubject: "Permit Application Status",
    daysSpread: 4,
    initialEmail: {
      subject: "Permit Application Status",
      body: `Hi Sarah,

Quick update on the permit applications for your kitchen renovation.

**Permit Status:**
✅ Building permit: APPROVED (received yesterday)
✅ Electrical permit: APPROVED 
✅ Plumbing permit: APPROVED
⏳ Mechanical permit: Under review (expected approval by Friday)

**What This Means:**
- We can start demo work on Monday as planned
- All major work is cleared to proceed
- Mechanical permit is just for the range hood vent - won't delay anything

**Inspector Schedule:**
- Rough electrical: Week 3 (February 19-23)
- Rough plumbing: Week 3 (February 19-23) 
- Final inspection: Week 6 (March 11-15)

I'll coordinate all inspections and make sure we're ready for each one. You don't need to be present unless you want to be.

Ready to transform your kitchen starting Monday!

Mike`,
      attachments: ['approved-permits.pdf']
    },
    replies: [
      {
        subject: "Re: Permit Application Status",
        body: `Hi Mike,

Great news on the permits! I'm relieved everything is approved and we can start on time.

I'd actually like to be present for the final inspection if possible - want to understand what they're checking so I know what to maintain going forward.

Also, should I do anything to prep for demo day Monday? Move anything, cover furniture in adjacent rooms, etc.?

Looking forward to Monday!

Sarah`,
        isReply: true,
        replyToSubject: "Permit Application Status"
      },
      {
        subject: "Re: Permit Application Status",
        body: `Hi Sarah,

Absolutely! I'll make sure you know when the final inspection is scheduled. It's actually really interesting to see what they check.

**Demo Day Prep:**
- We'll handle all kitchen prep (disconnecting appliances, protecting floors)
- Please remove any items from kitchen cabinets/pantry by Sunday night
- Cover dining room furniture with plastic (dust will travel)
- Consider staying elsewhere Monday-Tuesday if you're sensitive to noise/dust
- We'll have a dumpster delivered Sunday evening

**Our Demo Process:**
- Start with appliance removal
- Careful cabinet removal (we'll save any you want to donate)
- Protect your hardwood floors in adjacent rooms
- Daily cleanup so your house stays livable

Don't worry - we've done this hundreds of times and know how to minimize disruption!

Mike`,
        isReply: true,
        replyToSubject: "Permit Application Status"
      }
    ]
  }
];

class RealisticEmailGenerator {
  private oauth: EmailTestOAuth;
  private contractorEmail = 'nailit.test.contractor@gmail.com';
  private homeownerEmail = 'nailit.test.homeowner@gmail.com';

  constructor() {
    this.oauth = new EmailTestOAuth();
  }

  /**
   * MAIN METHOD: Generate realistic email conversations via Gmail API ONLY
   * 
   * CRITICAL: This method NEVER touches the database.
   * Emails are only sent via Gmail API and will enter our database through:
   * - Historical email discovery (Gmail API queries)
   * - Real-time webhook processing
   */
  async generateRealisticEmails(): Promise<void> {
    console.log('🧹 Cleaning up existing test emails...');
    await this.cleanupGmailInboxes();

    console.log('📧 Generating realistic email conversations...');
    await this.generateConversationThreads();

    console.log('✅ Realistic email generation complete!');
    console.log('');
    console.log('🔍 NEXT STEPS:');
    console.log('1. Use Gmail API queries to discover historical emails');
    console.log('2. Test webhook processing for real-time emails');
    console.log('3. Verify database is populated ONLY through ingestion pathways');
  }

  /**
   * Clean up Gmail inboxes using the Gmail cleanup utility
   * 
   * CRITICAL: This uses the Gmail API cleanup tool, NOT database operations
   */
  private async cleanupGmailInboxes(): Promise<void> {
    try {
      console.log('🗑️  Moving existing test emails to Gmail trash...');
      
      // Use the existing Gmail cleanup utility
      // This respects the principle of only using Gmail API operations
      const { spawn } = require('child_process');
      
      const cleanup = spawn('npx', ['tsx', 'scripts/email-testing/gmail-inbox-cleaner.ts', 'trash-all'], {
        stdio: 'inherit'
      });

      await new Promise((resolve, reject) => {
        cleanup.on('close', (code: number) => {
          if (code === 0) {
            resolve(code);
          } else {
            reject(new Error(`Gmail cleanup failed with code ${code}`));
          }
        });
      });

      console.log('✅ Gmail inboxes cleaned via Gmail API');

    } catch (error: any) {
      console.error('❌ Failed to cleanup Gmail inboxes:', error.message);
      console.log('⚠️  Continuing with email generation...');
    }
  }

  /**
   * Generate realistic conversation threads between homeowner and contractor
   * 
   * CRITICAL: Only sends emails via Gmail API, never writes to database
   */
  private async generateConversationThreads(): Promise<void> {
    const baseDate = new Date('2024-02-01'); // Project start date

    for (let i = 0; i < CONVERSATION_THREADS.length; i++) {
      const thread = CONVERSATION_THREADS[i];
      console.log(`📧 Generating thread ${i + 1}/${CONVERSATION_THREADS.length}: ${thread.threadSubject}`);

      // Calculate thread start date (spread threads over project timeline)
      const threadStartDate = new Date(baseDate);
      threadStartDate.setDate(baseDate.getDate() + (i * 7)); // Start threads 1 week apart

      // Send initial email from contractor
      await this.sendEmailViaGmailAPI(
        this.contractorEmail,
        this.homeownerEmail,
        thread.initialEmail.subject,
        thread.initialEmail.body,
        threadStartDate,
        thread.initialEmail.attachments
      );

      // Send replies with realistic timing
      for (let j = 0; j < thread.replies.length; j++) {
        const reply = thread.replies[j];
        const replyDate = new Date(threadStartDate);
        
        // Space replies throughout the thread timespan
        const replyDelayHours = ((j + 1) * thread.daysSpread * 24) / (thread.replies.length + 1);
        replyDate.setHours(replyDate.getHours() + replyDelayHours);

        // Alternate between homeowner and contractor replies
        const isHomeownerReply = j % 2 === 0;
        const from = isHomeownerReply ? this.homeownerEmail : this.contractorEmail;
        const to = isHomeownerReply ? this.contractorEmail : this.homeownerEmail;

        await this.sendEmailViaGmailAPI(
          from,
          to,
          reply.subject,
          reply.body,
          replyDate,
          reply.attachments
        );
      }

      // Add delay between threads to avoid rate limiting
      await this.delay(2000);
    }
  }

  /**
   * Send an email using Gmail API ONLY
   * 
   * CRITICAL: This method ONLY uses Gmail API. 
   * It NEVER writes to the database.
   * Database records will be created through proper ingestion pathways.
   */
  private async sendEmailViaGmailAPI(
    from: string,
    to: string,
    subject: string,
    body: string,
    date: Date,
    attachments?: string[]
  ): Promise<void> {
    try {
      console.log(`  📤 Sending via Gmail API: ${subject} (${from} → ${to})`);
      
      // Get Gmail API client for the sender account
      const accountType = from === this.contractorEmail ? 'contractor' : 'homeowner';
      const gmail = await this.oauth.getGmailClient(accountType);
      
      // Create email message in RFC 2822 format
      const emailMessage = this.createEmailMessage(from, to, subject, body, date, attachments);
      
      // Send via Gmail API
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: {
          raw: emailMessage
        }
      });

      console.log(`  ✅ Email sent via Gmail API! Message ID: ${response.data.id}`);
      console.log(`  📬 Check ${to} inbox`);
      
      // Add small delay to avoid overwhelming the API
      await this.delay(1000);

    } catch (error: any) {
      console.error(`❌ Failed to send email via Gmail API: ${subject}`, error.message);
      throw error;
    }
  }

  /**
   * Create RFC 2822 email message for Gmail API
   */
  private createEmailMessage(
    from: string,
    to: string,
    subject: string,
    body: string,
    date: Date,
    attachments?: string[]
  ): string {
    const email = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Date: ${date.toUTCString()}`,
      `Message-ID: <${Date.now()}.${Math.random().toString(36).substr(2, 9)}@gmail.com>`,
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

  console.log(`\n📧 Realistic Email Generator for Testing\n`);

  if (!command) {
    console.log(`Commands:`);
    console.log(`  generate      - Clean up and generate new realistic email conversations`);
    console.log(`  cleanup       - Remove existing test emails only`);
    console.log(``);
    console.log(`Usage: npm run test:emails:realistic [command]`);
    console.log(``);
    console.log(`🔄 IMPORTANT: This script ONLY sends emails via Gmail API.`);
    console.log(`   Database records are created through proper ingestion pathways:`);
    console.log(`   - Gmail API queries (historical discovery)`);
    console.log(`   - Webhooks (real-time processing)`);
    return;
  }

  const generator = new RealisticEmailGenerator();

  try {
    switch (command) {
      case 'generate':
        await generator.generateRealisticEmails();
        break;

      case 'cleanup':
        console.log('🧹 Cleaning up existing test emails...');
        await generator['cleanupGmailInboxes']();
        console.log('✅ Cleanup complete!');
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log(`Available commands: generate, cleanup`);
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

export { RealisticEmailGenerator }; 