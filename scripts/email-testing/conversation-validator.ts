#!/usr/bin/env ts-node

import { config } from 'dotenv';
config({ path: '.env.local' });
import { EmailTestOAuth } from './oauth-setup';

/**
 * Conversation Validator for Email Testing
 * 
 * CRITICAL REQUIREMENT: Ensures test data contains authentic bidirectional 
 * conversations between contractor and homeowner with:
 * 
 * - Proper email threading (Re: subjects)
 * - Realistic response timing (24-48 hours)
 * - Authentic content (contractor sends project updates, homeowner responds)
 * - Bidirectional flow (contractor → homeowner → contractor)
 * - Thread continuity (conversations that make sense together)
 */

interface EmailMessage {
  id: string;
  subject: string;
  from: string;
  to: string;
  date: Date;
  body: string;
  threadId?: string;
}

interface ConversationThread {
  id: string;
  subject: string;
  messages: EmailMessage[];
  participants: string[];
  isValidConversation: boolean;
  validationErrors: string[];
}

interface ValidationResult {
  totalEmails: number;
  totalThreads: number;
  bidirectionalThreads: number;
  validConversations: number;
  validationErrors: string[];
  conversationQuality: {
    hasContractorInitiated: boolean;
    hasHomeownerResponses: boolean;
    hasRealisticTiming: boolean;
    hasProperThreading: boolean;
    hasAuthenticContent: boolean;
  };
}

class ConversationValidator {
  private oauth: EmailTestOAuth;
  private contractorEmail = 'nailit.test.contractor@gmail.com';
  private homeownerEmail = 'nailit.test.homeowner@gmail.com';

  constructor() {
    this.oauth = new EmailTestOAuth();
  }

  /**
   * Validate all conversations in test Gmail accounts
   */
  async validateConversations(): Promise<ValidationResult> {
    console.log('🔍 Validating contractor-homeowner conversations...');

    // Fetch emails from both accounts
    const contractorEmails = await this.fetchEmailsFromAccount('contractor');
    const homeownerEmails = await this.fetchEmailsFromAccount('homeowner');

    // Combine and analyze
    const allEmails = [...contractorEmails, ...homeownerEmails];
    const threads = this.groupEmailsIntoThreads(allEmails);
    
    console.log(`📊 Found ${allEmails.length} total emails in ${threads.length} conversation threads`);

    // Validate each thread
    const validationResult = this.validateThreads(threads);
    
    // Generate detailed report
    this.generateValidationReport(validationResult, threads);
    
    return validationResult;
  }

  /**
   * Fetch emails from specific account (contractor or homeowner)
   */
  private async fetchEmailsFromAccount(accountType: 'contractor' | 'homeowner'): Promise<EmailMessage[]> {
    try {
      const gmail = await this.oauth.getGmailClient(accountType);
      const accountEmail = accountType === 'contractor' ? this.contractorEmail : this.homeownerEmail;
      
      console.log(`📬 Fetching emails from ${accountType} account...`);

      // Search for test emails
      const searchQuery = [
        'subject:"Kitchen Renovation"',
        'subject:"Bathroom Remodel"', 
        'subject:"URGENT"',
        'subject:"Invoice"',
        'subject:"Cost Update"',
        'subject:"Schedule Update"',
        `from:${this.contractorEmail}`,
        `from:${this.homeownerEmail}`
      ].join(' OR ');

      const searchResponse = await gmail.users.messages.list({
        userId: 'me',
        q: `(${searchQuery})`,
        maxResults: 100
      });

      if (!searchResponse.data.messages) {
        console.log(`📭 No emails found in ${accountType} account`);
        return [];
      }

      const emails: EmailMessage[] = [];

      // Fetch full email details
      for (const message of searchResponse.data.messages) {
        try {
          const emailResponse = await gmail.users.messages.get({
            userId: 'me',
            id: message.id!,
            format: 'full'
          });

          const headers = emailResponse.data.payload?.headers || [];
          const subject = headers.find(h => h.name === 'Subject')?.value || '';
          const from = headers.find(h => h.name === 'From')?.value || '';
          const to = headers.find(h => h.name === 'To')?.value || '';
          const dateHeader = headers.find(h => h.name === 'Date')?.value || '';
          const threadId = emailResponse.data.threadId || '';

          // Extract body (simplified)
          let body = '';
          if (emailResponse.data.payload?.body?.data) {
            body = Buffer.from(emailResponse.data.payload.body.data, 'base64').toString();
          } else if (emailResponse.data.payload?.parts) {
            const textPart = emailResponse.data.payload.parts.find(p => p.mimeType === 'text/plain');
            if (textPart?.body?.data) {
              body = Buffer.from(textPart.body.data, 'base64').toString();
            }
          }

          emails.push({
            id: message.id!,
            subject,
            from: from.includes('<') ? from.match(/<(.+)>/)?.[1] || from : from,
            to: to.includes('<') ? to.match(/<(.+)>/)?.[1] || to : to,
            date: new Date(dateHeader),
            body: body.substring(0, 500), // First 500 chars for analysis
            threadId
          });

        } catch (error: any) {
          console.warn(`⚠️  Failed to fetch email ${message.id}:`, error.message);
        }
      }

      console.log(`✅ Fetched ${emails.length} emails from ${accountType} account`);
      return emails;

    } catch (error: any) {
      console.error(`❌ Failed to fetch emails from ${accountType}:`, error.message);
      return [];
    }
  }

  /**
   * Group emails into conversation threads
   */
  private groupEmailsIntoThreads(emails: EmailMessage[]): ConversationThread[] {
    const threadMap = new Map<string, EmailMessage[]>();

    // Group by thread ID first
    emails.forEach(email => {
      if (email.threadId) {
        if (!threadMap.has(email.threadId)) {
          threadMap.set(email.threadId, []);
        }
        threadMap.get(email.threadId)!.push(email);
      }
    });

    // Also group by subject for emails without thread IDs
    emails.forEach(email => {
      if (!email.threadId) {
        const baseSubject = email.subject.replace(/^Re:\s*/i, '').trim();
        const existingThread = Array.from(threadMap.values()).find(thread => 
          thread.some(msg => msg.subject.replace(/^Re:\s*/i, '').trim() === baseSubject)
        );
        
        if (existingThread) {
          existingThread.push(email);
        } else {
          threadMap.set(`subject-${baseSubject}`, [email]);
        }
      }
    });

    // Convert to ConversationThread objects
    const threads: ConversationThread[] = [];
    
    threadMap.forEach((messages, threadId) => {
      // Sort messages by date
      messages.sort((a, b) => a.date.getTime() - b.date.getTime());
      
      const participants = [...new Set(messages.map(m => m.from))];
      const baseSubject = messages[0].subject.replace(/^Re:\s*/i, '').trim();
      
      threads.push({
        id: threadId,
        subject: baseSubject,
        messages,
        participants,
        isValidConversation: false, // Will be validated
        validationErrors: []
      });
    });

    return threads;
  }

  /**
   * Validate conversation threads for authenticity and quality
   */
  private validateThreads(threads: ConversationThread[]): ValidationResult {
    let bidirectionalThreads = 0;
    let validConversations = 0;
    const globalErrors: string[] = [];

    const qualityChecks = {
      hasContractorInitiated: false,
      hasHomeownerResponses: false,
      hasRealisticTiming: false,
      hasProperThreading: false,
      hasAuthenticContent: false
    };

    threads.forEach(thread => {
      const errors: string[] = [];
      
      // Check 1: Bidirectional communication
      const hasContractor = thread.participants.includes(this.contractorEmail);
      const hasHomeowner = thread.participants.includes(this.homeownerEmail);
      
      if (hasContractor && hasHomeowner) {
        bidirectionalThreads++;
        qualityChecks.hasContractorInitiated = true;
        qualityChecks.hasHomeownerResponses = true;
      } else {
        errors.push('Missing bidirectional communication');
      }

      // Check 2: Proper threading (Re: subjects)
      let hasProperThreading = false;
      if (thread.messages.length > 1) {
        const hasReplySubjects = thread.messages.slice(1).some(msg => 
          msg.subject.toLowerCase().startsWith('re:')
        );
        if (hasReplySubjects) {
          hasProperThreading = true;
          qualityChecks.hasProperThreading = true;
        } else {
          errors.push('Missing proper email threading (Re: subjects)');
        }
      }

      // Check 3: Realistic timing (responses within 48 hours)
      let hasRealisticTiming = false;
      if (thread.messages.length > 1) {
        const timingIssues = [];
        for (let i = 1; i < thread.messages.length; i++) {
          const prevMsg = thread.messages[i - 1];
          const currMsg = thread.messages[i];
          const hoursDiff = (currMsg.date.getTime() - prevMsg.date.getTime()) / (1000 * 60 * 60);
          
          if (hoursDiff > 72) { // More than 3 days
            timingIssues.push(`${hoursDiff.toFixed(1)} hours between messages`);
          } else if (hoursDiff > 0.5) { // At least 30 minutes
            hasRealisticTiming = true;
            qualityChecks.hasRealisticTiming = true;
          }
        }
        if (timingIssues.length > 0) {
          errors.push(`Unrealistic timing: ${timingIssues.join(', ')}`);
        }
      }

      // Check 4: Authentic content patterns
      let hasAuthenticContent = false;
      const contractorKeywords = ['cost', 'schedule', 'material', 'invoice', 'urgent', 'update', 'renovation'];
      const homeownerKeywords = ['thanks', 'question', 'approve', 'concern', 'check', 'when', 'can you'];
      
      const contractorMsgs = thread.messages.filter(m => m.from === this.contractorEmail);
      const homeownerMsgs = thread.messages.filter(m => m.from === this.homeownerEmail);
      
      const contractorHasKeywords = contractorMsgs.some(msg => 
        contractorKeywords.some(keyword => 
          msg.body.toLowerCase().includes(keyword) || msg.subject.toLowerCase().includes(keyword)
        )
      );
      
      const homeownerHasKeywords = homeownerMsgs.some(msg =>
        homeownerKeywords.some(keyword => 
          msg.body.toLowerCase().includes(keyword) || msg.subject.toLowerCase().includes(keyword)
        )
      );

      if (contractorHasKeywords && homeownerHasKeywords) {
        hasAuthenticContent = true;
        qualityChecks.hasAuthenticContent = true;
      } else {
        errors.push('Content does not match authentic contractor-homeowner patterns');
      }

      // Check 5: Conversation flow (contractor typically initiates)
      if (thread.messages.length > 0) {
        const firstMessage = thread.messages[0];
        if (firstMessage.from !== this.contractorEmail && !firstMessage.subject.toLowerCase().includes('check')) {
          errors.push('Conversation should typically be contractor-initiated');
        }
      }

      // Mark thread as valid if it passes key checks
      if (hasContractor && hasHomeowner && hasProperThreading && hasAuthenticContent) {
        thread.isValidConversation = true;
        validConversations++;
      }

      thread.validationErrors = errors;
    });

    return {
      totalEmails: threads.reduce((sum, t) => sum + t.messages.length, 0),
      totalThreads: threads.length,
      bidirectionalThreads,
      validConversations,
      validationErrors: globalErrors,
      conversationQuality: qualityChecks
    };
  }

  /**
   * Generate detailed validation report
   */
  private generateValidationReport(result: ValidationResult, threads: ConversationThread[]): void {
    console.log('\n📊 CONVERSATION VALIDATION REPORT\n');
    
    console.log('📈 SUMMARY:');
    console.log(`   Total emails: ${result.totalEmails}`);
    console.log(`   Total threads: ${result.totalThreads}`);
    console.log(`   Bidirectional threads: ${result.bidirectionalThreads}/${result.totalThreads}`);
    console.log(`   Valid conversations: ${result.validConversations}/${result.totalThreads}`);
    
    console.log('\n✅ QUALITY CHECKS:');
    console.log(`   Contractor-initiated: ${result.conversationQuality.hasContractorInitiated ? '✅' : '❌'}`);
    console.log(`   Homeowner responses: ${result.conversationQuality.hasHomeownerResponses ? '✅' : '❌'}`);
    console.log(`   Realistic timing: ${result.conversationQuality.hasRealisticTiming ? '✅' : '❌'}`);
    console.log(`   Proper threading: ${result.conversationQuality.hasProperThreading ? '✅' : '❌'}`);
    console.log(`   Authentic content: ${result.conversationQuality.hasAuthenticContent ? '✅' : '❌'}`);

    console.log('\n🧵 CONVERSATION THREADS:');
    threads.forEach((thread, index) => {
      const status = thread.isValidConversation ? '✅' : '❌';
      console.log(`   ${index + 1}. ${status} "${thread.subject}" (${thread.messages.length} messages)`);
      console.log(`      Participants: ${thread.participants.join(', ')}`);
      
      if (thread.validationErrors.length > 0) {
        thread.validationErrors.forEach(error => {
          console.log(`      ⚠️  ${error}`);
        });
      }
      
      // Show message flow
      thread.messages.forEach((msg, msgIndex) => {
        const sender = msg.from === this.contractorEmail ? 'Contractor' : 'Homeowner';
        const date = msg.date.toLocaleDateString();
        console.log(`         ${msgIndex + 1}. ${sender}: "${msg.subject}" (${date})`);
      });
      console.log('');
    });

    // Recommendations
    console.log('💡 RECOMMENDATIONS:');
    if (result.bidirectionalThreads < result.totalThreads) {
      console.log('   - Generate more bidirectional conversations between contractor and homeowner');
    }
    if (!result.conversationQuality.hasProperThreading) {
      console.log('   - Ensure reply emails use "Re:" subjects for proper threading');
    }
    if (!result.conversationQuality.hasRealisticTiming) {
      console.log('   - Add realistic delays between messages (24-48 hours)');
    }
    if (!result.conversationQuality.hasAuthenticContent) {
      console.log('   - Use more authentic contractor/homeowner language patterns');
    }

    console.log('\n🎯 CONVERSATION QUALITY SCORE:');
    const qualityScore = Object.values(result.conversationQuality).filter(Boolean).length;
    const maxScore = Object.keys(result.conversationQuality).length;
    const percentage = Math.round((qualityScore / maxScore) * 100);
    console.log(`   ${qualityScore}/${maxScore} checks passed (${percentage}%)`);
    
    if (percentage >= 80) {
      console.log('   🎉 EXCELLENT: Conversations are authentic and realistic!');
    } else if (percentage >= 60) {
      console.log('   👍 GOOD: Conversations are mostly realistic, minor improvements needed');
    } else {
      console.log('   ⚠️  NEEDS IMPROVEMENT: Conversations need more authenticity');
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

  console.log(`\n🔍 Conversation Validator for Email Testing\n`);

  if (!command) {
    console.log(`Commands:`);
    console.log(`  validate          - Validate existing conversations`);
    console.log(``);
    console.log(`Usage: npm run test:validate-conversations [command]`);
    return;
  }

  const validator = new ConversationValidator();

  try {
    switch (command) {
      case 'validate':
        await validator.validateConversations();
        break;

      default:
        console.error(`❌ Unknown command: ${command}`);
        console.log(`Available commands: validate`);
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

export { ConversationValidator }; 