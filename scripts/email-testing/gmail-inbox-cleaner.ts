#!/usr/bin/env ts-node

import { config } from 'dotenv';
config({ path: '.env.local' });
import { EmailTestOAuth } from './oauth-setup';

/**
 * Gmail Inbox Cleaner for Test Automation
 * 
 * Safely removes test emails from Gmail accounts using the trash method
 * (works with gmail.modify scope - no need for full gmail access)
 * 
 * Usage:
 *   npm run test:gmail:cleanup-preview    # Preview what would be cleaned
 *   npm run test:gmail:cleanup-all        # Move all test emails to trash
 *   npm run test:gmail:cleanup-recent 7   # Move recent emails to trash
 */

interface CleanupOptions {
  account: 'homeowner' | 'contractor' | 'both';
  subjectFilter?: string;
  daysBack?: number;
  dryRun?: boolean;
  method?: 'trash' | 'delete';  // New option for cleanup method
}

class GmailInboxCleaner {
  private oauth: EmailTestOAuth;

  constructor() {
    this.oauth = new EmailTestOAuth();
  }

  /**
   * Clean up Gmail inboxes by moving test emails to trash
   */
  async cleanupInboxes(options: CleanupOptions): Promise<void> {
    const { account, dryRun = false, method = 'trash' } = options;
    
    console.log(`\n🧹 Gmail Inbox Cleaner${dryRun ? ' (Preview Mode)' : ''}`);
    console.log(`📧 Method: ${method === 'trash' ? 'Move to Trash' : 'Permanent Delete'}`);
    console.log(`🎯 Target: ${account} account${account === 'both' ? 's' : ''}`);
    console.log(`🔍 Search criteria: ${this.buildSearchQuery(options)}`);
    
    if (method === 'delete') {
      console.log(`⚠️  WARNING: Permanent deletion requires full Gmail scope (https://mail.google.com/)`);
      console.log(`   Current scope only supports moving to trash. Use method: 'trash' instead.`);
      return;
    }

    if (account === 'both') {
      await this.cleanupAccount('contractor', options);
      await this.cleanupAccount('homeowner', options);
    } else {
      await this.cleanupAccount(account, options);
    }

    console.log(`\n✅ Cleanup ${dryRun ? 'preview' : 'completed'}!`);
  }

  private async cleanupAccount(account: 'homeowner' | 'contractor', options: CleanupOptions): Promise<void> {
    const { dryRun = false, method = 'trash' } = options;
    
    console.log(`\n📬 Processing ${account} account...`);

    try {
      const gmail = this.oauth.getGmailClient(account);
      const query = this.buildSearchQuery(options);

      // Search for emails
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 500  // Reasonable batch size
      });

      const messages = response.data.messages || [];
      
      if (messages.length === 0) {
        console.log(`   📭 No emails found matching criteria`);
        return;
      }

      console.log(`   📮 Found ${messages.length} emails`);

      if (dryRun) {
        await this.previewEmails(gmail, messages, account);
      } else {
        if (method === 'trash') {
          await this.trashEmailsBatch(gmail, messages, account);
        } else {
          console.log(`   ❌ Permanent deletion not supported with current OAuth scope`);
          console.log(`   💡 Use 'trash' method or upgrade to full Gmail scope`);
        }
      }

    } catch (error: any) {
      console.error(`❌ Failed to clean ${account} account:`, error.message);
    }
  }

  /**
   * Preview emails that would be affected
   */
  private async previewEmails(gmail: any, messages: any[], account: string): Promise<void> {
    console.log(`   👀 Preview of emails that would be moved to trash:`);
    
    // Show first 5 emails as preview
    for (let i = 0; i < Math.min(5, messages.length); i++) {
      try {
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: messages[i].id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date']
        });

        const headers = messageResponse.data.payload?.headers || [];
        const subject = headers.find((h: any) => h.name === 'Subject')?.value || 'No subject';
        const from = headers.find((h: any) => h.name === 'From')?.value || 'No sender';
        const date = headers.find((h: any) => h.name === 'Date')?.value || 'No date';

        console.log(`   ${i + 1}. "${subject}" from ${from} (${date})`);

      } catch (error: any) {
        console.log(`   ${i + 1}. [Error fetching preview: ${error.message}]`);
      }
    }

    if (messages.length > 5) {
      console.log(`   ... and ${messages.length - 5} more emails`);
    }
    console.log('');
  }

  /**
   * Move emails to trash in batches (safer than permanent deletion)
   */
  private async trashEmailsBatch(gmail: any, messages: any[], account: string): Promise<void> {
    const batchSize = 10;
    let trashedCount = 0;

    for (let i = 0; i < messages.length; i += batchSize) {
      const batch = messages.slice(i, i + batchSize);
      
      console.log(`🗑️  Moving batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(messages.length / batchSize)} to trash (${batch.length} emails)...`);

      // Move emails to trash in parallel within the batch
      const trashPromises = batch.map(async (message: any) => {
        try {
          await gmail.users.messages.trash({
            userId: 'me',
            id: message.id
          });
          return true;
        } catch (error: any) {
          console.error(`   ❌ Failed to trash message ${message.id}:`, error.message);
          return false;
        }
      });

      const results = await Promise.all(trashPromises);
      const batchTrashedCount = results.filter(r => r).length;
      trashedCount += batchTrashedCount;

      console.log(`   ✅ Moved ${batchTrashedCount}/${batch.length} emails to trash`);

      // Rate limiting: wait between batches
      if (i + batchSize < messages.length) {
        console.log(`   ⏳ Waiting 2 seconds before next batch...`);
        await this.delay(2000);
      }
    }

    console.log(`📊 Total moved to trash: ${trashedCount}/${messages.length} emails from ${account} account`);
    console.log(`💡 Emails are in trash and can be recovered if needed`);
  }

  /**
   * Build Gmail search query based on options
   */
  private buildSearchQuery(options: CleanupOptions): string {
    const queryParts: string[] = [];

    // Add subject filter
    if (options.subjectFilter) {
      queryParts.push(`subject:"${options.subjectFilter}"`);
    } else {
      // Default: search for common test email patterns
      queryParts.push(`(subject:"Kitchen Renovation" OR subject:"Bathroom Remodel" OR subject:"URGENT" OR subject:"Invoice" OR subject:"Cost Update" OR subject:"Schedule Update" OR from:nailit.test.contractor@gmail.com OR from:nailit.test.homeowner@gmail.com)`);
    }

    // Add date filter
    if (options.daysBack) {
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - options.daysBack);
      const dateStr = daysAgo.toISOString().split('T')[0].replace(/-/g, '/');
      queryParts.push(`after:${dateStr}`);
    }

    return queryParts.join(' ');
  }

  /**
   * Move all test emails to trash (convenience method)
   */
  async trashAllTestEmails(): Promise<void> {
    await this.cleanupInboxes({
      account: 'both',
      dryRun: false,
      method: 'trash'
    });
  }

  /**
   * Preview what would be moved to trash (convenience method)
   */
  async previewCleanup(): Promise<void> {
    await this.cleanupInboxes({
      account: 'both',
      dryRun: true
    });
  }

  /**
   * Move recent test emails to trash (last N days)
   */
  async trashRecentTestEmails(daysBack: number = 7): Promise<void> {
    await this.cleanupInboxes({
      account: 'both',
      daysBack,
      dryRun: false,
      method: 'trash'
    });
  }

  /**
   * Empty trash completely (requires full Gmail scope)
   */
  async emptyTrash(): Promise<void> {
    console.log(`⚠️  Empty trash requires full Gmail scope (https://mail.google.com/)`);
    console.log(`   Current scope (gmail.modify) only allows moving to trash`);
    console.log(`   To permanently delete, upgrade OAuth scope and use method: 'delete'`);
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

  const cleaner = new GmailInboxCleaner();

  try {
    switch (command) {
      case 'preview':
        await cleaner.previewCleanup();
        break;

      case 'trash-all':
        console.log('⚠️  This will move ALL test emails to trash in both Gmail accounts!');
        await cleaner.trashAllTestEmails();
        break;

      case 'trash-recent':
        const days = parseInt(args[1]) || 7;
        console.log(`⚠️  This will move test emails from the last ${days} days to trash!`);
        await cleaner.trashRecentTestEmails(days);
        break;

      case 'trash-homeowner':
        await cleaner.cleanupInboxes({ account: 'homeowner', dryRun: false, method: 'trash' });
        break;

      case 'trash-contractor':
        await cleaner.cleanupInboxes({ account: 'contractor', dryRun: false, method: 'trash' });
        break;

      case 'trash-subject':
        const subject = args[1];
        if (!subject) {
          console.error('❌ Please provide a subject filter');
          process.exit(1);
        }
        await cleaner.cleanupInboxes({ 
          account: 'both', 
          subjectFilter: subject, 
          dryRun: false,
          method: 'trash'
        });
        break;

      case 'empty-trash':
        await cleaner.emptyTrash();
        break;

      // Legacy delete commands (show warning)
      case 'delete-all':
      case 'delete-recent':
      case 'delete-homeowner':
      case 'delete-contractor':
      case 'delete-subject':
        console.log(`⚠️  Permanent deletion requires full Gmail scope upgrade`);
        console.log(`   Use 'trash-*' commands instead (safer for testing)`);
        console.log(`   Example: npm run test:gmail:cleanup trash-all`);
        break;

      default:
        console.log(`\n🧹 Gmail Inbox Cleaner (Automated Testing)\n`);
        console.log(`Usage:`);
        console.log(`  npm run test:gmail:cleanup preview           # Preview what would be moved to trash`);
        console.log(`  npm run test:gmail:cleanup trash-all        # Move all test emails to trash`);
        console.log(`  npm run test:gmail:cleanup trash-recent 7   # Move emails from last 7 days to trash`);
        console.log(`  npm run test:gmail:cleanup trash-homeowner  # Move from homeowner only`);
        console.log(`  npm run test:gmail:cleanup trash-contractor # Move from contractor only`);
        console.log(`  npm run test:gmail:cleanup trash-subject "Kitchen Renovation" # Move by subject`);
        console.log(`  npm run test:gmail:cleanup empty-trash      # Info about permanent deletion`);
        console.log(`\n💡 All commands use 'trash' method (recoverable) with current OAuth scope`);
        console.log(`⚠️  For permanent deletion, upgrade to full Gmail scope (https://mail.google.com/)`);
        break;
    }

  } catch (error: any) {
    console.error(`❌ Gmail cleanup failed:`, error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { GmailInboxCleaner }; 