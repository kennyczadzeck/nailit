#!/usr/bin/env ts-node

import { config } from 'dotenv';
config({ path: '.env.local' });
import { EmailTestOAuth } from './oauth-setup';
import { prisma } from '../../app/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Realistic Email Generator for Testing
 * 
 * Generates realistic email conversations between homeowner and contractor
 * that include:
 * - Threaded conversations (replies/responses)
 * - Realistic construction project content
 * - Attachments (PDFs like quotes, invoices, permits)
 * - Only between test homeowner and test contractor accounts
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

Great progress update! The cabinet installation is going smoothly and we're actually ahead of schedule.

**This Week's Progress:**
- All base cabinets installed and leveled
- Upper cabinets going in today and tomorrow  
- Hardware installation starts Friday
- Countertop template scheduled for next Tuesday

**What You'll Notice:**
The kitchen is really starting to take shape! The cabinet quality is excellent and the soft-close hinges work perfectly. The brushed brass hardware you selected looks fantastic against the cabinet finish.

**Next Week:**
- Countertop installation (Wednesday)
- Backsplash tile work begins (Thursday)
- Appliance delivery and installation (Friday)

We're tracking to finish 3 days early! I'll send photos of today's progress.

Any questions about the upcoming countertop installation? They'll need access Tuesday 9 AM - 12 PM for templating.

Best,
Mike`,
      attachments: ['cabinet-progress-photos.pdf']
    },
    replies: [
      {
        subject: "Re: Cabinet Installation Update",
        body: `Hi Mike,

This is such exciting progress! I love seeing it come together.

Tuesday 9 AM - 12 PM works perfectly for countertop templating. I'll plan to be there to see how it looks.

Quick question about the backsplash - I've been thinking about the subway tile we selected. Would it be possible to see it against the cabinets before we install? I want to make sure the color is right.

Also, for appliance delivery Friday - do I need to be there, or can your team handle it?

Thanks for staying ahead of schedule!

Sarah`,
        isReply: true,
        replyToSubject: "Cabinet Installation Update"
      },
      {
        subject: "Re: Cabinet Installation Update",
        body: `Hi Sarah,

**Backsplash Preview:**
Great idea! I'll bring a few subway tile samples Tuesday when the countertop guys are there. We can hold them up and see how they look with everything together. If you want to change, we have time since tile work doesn't start until Thursday.

**Appliance Delivery:**
I can handle the delivery - I'll be there to check everything and make sure there's no damage. The delivery crew will just drop them in the garage, and we'll move them to final positions after countertops are in.

**Timing Update:**
Actually, we might finish a full week early at this pace! The crew is working really efficiently and everything is going smoothly.

See you Tuesday!

Mike`,
        isReply: true,
        replyToSubject: "Cabinet Installation Update"
      }
    ]
  },
  {
    threadSubject: "Final Invoice and Project Completion",
    daysSpread: 2,
    initialEmail: {
      subject: "Final Invoice and Project Completion",
      body: `Hi Sarah,

I'm thrilled to let you know that your kitchen renovation is officially complete! It has been an absolute pleasure working with you and your husband on this project.

**Project Summary:**
- Started: February 1st
- Completed: March 12th (5 days ahead of schedule!)
- Final cost: $48,350 (including plumbing repairs and hardware upgrade)

**What's Included in Final Payment:**
- Remaining balance: $12,087.50
- All warranties and documentation attached
- Maintenance guide for your new fixtures

**Warranty Information:**
- Cabinets: 10 years manufacturer + 2 years installation
- Countertops: Lifetime warranty on material, 5 years installation
- Plumbing work: 3 years full warranty
- General workmanship: 2 years

The kitchen looks absolutely stunning! I hope you and your family enjoy cooking and entertaining in your beautiful new space.

Please don't hesitate to reach out if you have any questions or need anything in the future.

Best regards,
Mike Johnson
Johnson Construction`,
      attachments: ['final-invoice-kitchen-renovation.pdf', 'warranty-documentation.pdf', 'kitchen-maintenance-guide.pdf']
    },
    replies: [
      {
        subject: "Re: Final Invoice and Project Completion",
        body: `Hi Mike,

We absolutely LOVE the kitchen! You and your team did an incredible job, and finishing early was such a nice surprise.

The quality of work is outstanding - everything is exactly what we hoped for and more. Thank you for being so professional, communicative, and flexible throughout the project.

I'll send the final payment by Friday. Also, I've already recommended you to my neighbor who's thinking about a bathroom remodel. I gave her your contact information.

Thank you again for making this such a positive experience!

Best regards,
Sarah`,
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

Quick update on our permit application for the electrical and plumbing work.

**Current Status:**
- Application submitted to city planning department
- Initial review completed - no issues found
- Electrical inspection scheduled for February 15th at 10 AM
- Plumbing inspection scheduled for February 16th at 2 PM

**What This Means:**
We're on track with our timeline. The inspections are routine and I expect them to pass without issues. I'll be there for both inspections to walk through everything with the inspectors.

**Your Action:**
No action needed from you! I just wanted to keep you informed of our progress.

**Next Steps:**
- Pass inspections (confident we will)
- Receive final permits
- Continue with cabinet installation as planned

I'll update you after each inspection.

Best,
Mike`,
      attachments: ['permit-application-copy.pdf']
    },
    replies: [
      {
        subject: "Re: Permit Application Status",
        body: `Hi Mike,

Thanks for keeping me in the loop! I appreciate how you handle all the permit stuff - it's one less thing for me to worry about.

Will the inspectors need access to other parts of the house, or just the kitchen area?

Also, if there are any issues (though I'm sure there won't be), how would that affect our timeline?

Thanks!
Sarah`,
        isReply: true,
        replyToSubject: "Permit Application Status"
      },
      {
        subject: "Re: Permit Application Status",
        body: `Hi Sarah,

**Inspector Access:**
Just the kitchen area and basement where the new electrical panel is. They won't need to go anywhere else in the house.

**If Issues Arise:**
Very unlikely, but if there were any issues, it would typically be minor things like:
- Adding a GFCI outlet (1 day delay)
- Adjusting a pipe connection (1-2 day delay)

I've never had a major issue that caused significant delays - my crew knows the codes well and we always build to exceed requirements.

**Good News:**
Electrical inspection this morning went perfectly! Inspector was impressed with the clean installation. Plumbing inspection tomorrow should be just as smooth.

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
   * Clean up existing emails and generate new realistic conversations
   */
  async generateRealisticEmails(): Promise<void> {
    console.log('🧹 Cleaning up existing test emails...');
    await this.cleanupExistingEmails();

    console.log('👥 Setting up test project with single contractor...');
    await this.setupTestProjectWithSingleContractor();

    console.log('📧 Generating realistic email conversations...');
    await this.generateConversationThreads();

    console.log('✅ Realistic email generation complete!');
  }

  /**
   * Remove all existing emails from test accounts
   */
  private async cleanupExistingEmails(): Promise<void> {
    try {
      // Clean up database records
      const deleteResult = await prisma.emailMessage.deleteMany({
        where: {
          OR: [
            { sender: this.contractorEmail },
            { sender: this.homeownerEmail },
            { recipients: { has: this.contractorEmail } },
            { recipients: { has: this.homeownerEmail } }
          ]
        }
      });

      console.log(`✅ Deleted ${deleteResult.count} email records from database`);

      // TODO: Add Gmail API calls to delete emails from actual Gmail accounts
      // This would require additional OAuth scopes and implementation
      console.log('⚠️  Note: Gmail account cleanup would require additional implementation');

    } catch (error: any) {
      console.error('❌ Failed to cleanup existing emails:', error.message);
      throw error;
    }
  }

  /**
   * Set up test project with only the contractor as team member
   */
  private async setupTestProjectWithSingleContractor(): Promise<void> {
    try {
      // Find or create test homeowner user
      let homeowner = await prisma.user.findUnique({
        where: { email: this.homeownerEmail }
      });

      if (!homeowner) {
        homeowner = await prisma.user.create({
          data: {
            email: this.homeownerEmail,
            name: 'Sarah Test Homeowner',
          }
        });
      }

      // Find or create test project
      let project = await prisma.project.findFirst({
        where: { 
          userId: homeowner.id,
          name: 'Kitchen Renovation Test Project'
        }
      });

      if (!project) {
        project = await prisma.project.create({
          data: {
            name: 'Kitchen Renovation Test Project',
            description: 'Complete kitchen renovation with realistic email testing',
            status: 'ACTIVE',
            startDate: new Date('2024-02-01'),
            contractor: 'Johnson Construction',
            budget: 50000,
            address: '123 Test Street, Test City, CA 90210',
            userId: homeowner.id,
          }
        });
      }

      // Remove all existing team members
      await prisma.teamMember.deleteMany({
        where: { projectId: project.id }
      });

      // Add only the contractor as team member
      await prisma.teamMember.create({
        data: {
          name: 'Mike Johnson',
          email: this.contractorEmail,
          role: 'GENERAL_CONTRACTOR',
          projectId: project.id,
        }
      });

      // Ensure email monitoring is enabled
      await prisma.emailSettings.upsert({
        where: { projectId: project.id },
        update: {
          monitoringEnabled: true,
          gmailConnected: true,
          notificationsEnabled: true,
        },
        create: {
          projectId: project.id,
          monitoringEnabled: true,
          gmailConnected: true,
          notificationsEnabled: true,
        }
      });

      console.log(`✅ Project setup complete:`);
      console.log(`   Project ID: ${project.id}`);
      console.log(`   Homeowner: ${homeowner.email}`);
      console.log(`   Contractor: ${this.contractorEmail}`);
      console.log(`   Team Members: 1 (contractor only)`);

    } catch (error: any) {
      console.error('❌ Failed to setup test project:', error.message);
      throw error;
    }
  }

  /**
   * Generate realistic conversation threads between homeowner and contractor
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
      await this.sendEmail(
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

        await this.sendEmail(
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
   * Send an email using Gmail API
   */
  private async sendEmail(
    from: string,
    to: string,
    subject: string,
    body: string,
    date: Date,
    attachments?: string[]
  ): Promise<void> {
    try {
      console.log(`  📤 Sending: ${subject} (${from} → ${to})`);
      
      // Create email message
      const emailMessage = this.createEmailMessage(from, to, subject, body, date, attachments);
      
      // TODO: Implement actual Gmail API sending
      // For now, we'll simulate the email creation
      console.log(`  ✅ Email simulated: ${subject}`);
      
      // Add small delay to avoid overwhelming the API
      await this.delay(1000);

    } catch (error: any) {
      console.error(`❌ Failed to send email: ${subject}`, error.message);
      throw error;
    }
  }

  /**
   * Create RFC 2822 email message
   */
  private createEmailMessage(
    from: string,
    to: string,
    subject: string,
    body: string,
    date: Date,
    attachments?: string[]
  ): string {
    const messageId = `<${Date.now()}.${Math.random().toString(36).substr(2, 9)}@${from.split('@')[1]}>`;
    
    let message = [
      `From: ${from}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      `Date: ${date.toUTCString()}`,
      `Message-ID: ${messageId}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      body
    ].join('\r\n');

    if (attachments && attachments.length > 0) {
      message += `\r\n\r\n[Attachments: ${attachments.join(', ')}]`;
    }

    return Buffer.from(message).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  /**
   * Create realistic PDF attachments for testing
   */
  private async createTestAttachments(): Promise<void> {
    const attachmentsDir = path.join(__dirname, 'test-attachments');
    
    if (!fs.existsSync(attachmentsDir)) {
      fs.mkdirSync(attachmentsDir, { recursive: true });
    }

    // Create placeholder PDF files for testing
    const testPDFs = [
      'kitchen-renovation-quote.pdf',
      'plumbing-damage-photos.pdf',
      'cabinet-progress-photos.pdf',
      'final-invoice-kitchen-renovation.pdf',
      'warranty-documentation.pdf',
      'kitchen-maintenance-guide.pdf',
      'permit-application-copy.pdf'
    ];

    for (const pdfName of testPDFs) {
      const pdfPath = path.join(attachmentsDir, pdfName);
      if (!fs.existsSync(pdfPath)) {
        // Create a simple text file as PDF placeholder
        const content = `This is a test PDF attachment: ${pdfName}\nGenerated for email testing purposes.\nDate: ${new Date().toISOString()}`;
        fs.writeFileSync(pdfPath, content);
      }
    }

    console.log(`✅ Created ${testPDFs.length} test attachment files`);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const generator = new RealisticEmailGenerator();

  try {
    switch (command) {
      case 'generate':
        await generator.generateRealisticEmails();
        break;
      case 'cleanup':
        await generator['cleanupExistingEmails']();
        break;
      case 'setup-project':
        await generator['setupTestProjectWithSingleContractor']();
        break;
      default:
        console.log('📧 Realistic Email Generator for Testing');
        console.log('');
        console.log('Commands:');
        console.log('  generate      - Clean up and generate new realistic email conversations');
        console.log('  cleanup       - Remove existing test emails only');
        console.log('  setup-project - Set up test project with single contractor only');
        console.log('');
        console.log('Usage: npm run test:emails:realistic [command]');
        break;
    }
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { RealisticEmailGenerator }; 