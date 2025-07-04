#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

// Load environment variables
config({ path: '.env.local' });

/**
 * Simple Gmail API Test
 * 
 * Tests basic Gmail API functionality to troubleshoot email fetching issues
 */

class GmailAPITest {
  private oauth2Client: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_TEST_CLIENT_ID,
      process.env.GMAIL_TEST_CLIENT_SECRET,
      'http://localhost:3001/auth/gmail/callback'
    );
  }

  /**
   * Test Gmail API connection
   */
  async testConnection(): Promise<void> {
    console.log(`🔍 Testing Gmail API Connection\n`);

    try {
      // Load homeowner credentials
      const credentialsPath = path.join(__dirname, 'credentials/homeowner-credentials.json');
      
      if (!fs.existsSync(credentialsPath)) {
        console.error(`❌ Credentials not found: ${credentialsPath}`);
        return;
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      this.oauth2Client.setCredentials({
        refresh_token: credentials.refresh_token,
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      // Test 1: Get user profile
      console.log(`📧 Testing user profile...`);
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log(`✅ Profile: ${profile.data.emailAddress}`);
      console.log(`   Messages: ${profile.data.messagesTotal}`);
      console.log(`   History ID: ${profile.data.historyId}`);

      // Test 2: List recent messages
      console.log(`\n📬 Testing message list...`);
      const messageList = await gmail.users.messages.list({
        userId: 'me',
        maxResults: 5
      });

      const messages = messageList.data.messages || [];
      console.log(`✅ Found ${messages.length} recent messages`);

      if (messages.length > 0) {
        const latestMessage = messages[0];
        console.log(`   Latest message ID: ${latestMessage.id}`);

        // Test 3: Get specific message
        console.log(`\n📄 Testing message fetch...`);
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: latestMessage.id!,
          format: 'full'
        });

        const message = messageResponse.data;
        const headers = message.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
        const from = headers.find(h => h.name === 'From')?.value || 'No sender';

        console.log(`✅ Message fetched successfully:`);
        console.log(`   Subject: ${subject}`);
        console.log(`   From: ${from}`);
        console.log(`   Has payload: ${!!message.payload}`);
        console.log(`   Headers count: ${headers.length}`);

        // Test 4: Test with specific message ID if provided
        const testMessageId = process.argv[2];
        if (testMessageId) {
          console.log(`\n🎯 Testing specific message ID: ${testMessageId}`);
          try {
            const specificMessage = await gmail.users.messages.get({
              userId: 'me',
              id: testMessageId,
              format: 'full'
            });

            const specificHeaders = specificMessage.data.payload?.headers || [];
            const specificSubject = specificHeaders.find(h => h.name === 'Subject')?.value || 'No subject';
            const specificFrom = specificHeaders.find(h => h.name === 'From')?.value || 'No sender';

            console.log(`✅ Specific message found:`);
            console.log(`   Subject: ${specificSubject}`);
            console.log(`   From: ${specificFrom}`);
            console.log(`   Message ID: ${specificMessage.data.id}`);
            console.log(`   Thread ID: ${specificMessage.data.threadId}`);

          } catch (error: any) {
            console.error(`❌ Failed to fetch specific message:`, error.message);
            console.log(`   This could mean the message ID is invalid or not accessible`);
          }
        }
      }

      console.log(`\n✅ Gmail API test completed successfully!`);

    } catch (error: any) {
      console.error(`❌ Gmail API test failed:`, error.message);
      
      if (error.message?.includes('invalid_grant')) {
        console.log(`\n💡 Suggestion: Credentials may be expired. Try refreshing OAuth tokens.`);
      } else if (error.message?.includes('unauthorized')) {
        console.log(`\n💡 Suggestion: Check OAuth permissions and scopes.`);
      } else if (error.message?.includes('not found')) {
        console.log(`\n💡 Suggestion: Message ID may not exist or be accessible.`);
      }
    }
  }

  /**
   * Test message search
   */
  async testSearch(query: string = 'URGENT'): Promise<void> {
    console.log(`\n🔍 Testing Gmail search with query: "${query}"\n`);

    try {
      const credentialsPath = path.join(__dirname, 'credentials/homeowner-credentials.json');
      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      
      this.oauth2Client.setCredentials({
        refresh_token: credentials.refresh_token,
        access_token: credentials.access_token,
        expiry_date: credentials.expiry_date
      });

      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

      const searchResponse = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 10
      });

      const messages = searchResponse.data.messages || [];
      console.log(`✅ Search found ${messages.length} messages`);

      for (let i = 0; i < Math.min(messages.length, 3); i++) {
        const message = messages[i];
        const messageResponse = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'Date']
        });

        const headers = messageResponse.data.payload?.headers || [];
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No subject';
        const from = headers.find(h => h.name === 'From')?.value || 'No sender';
        const date = headers.find(h => h.name === 'Date')?.value || 'No date';

        console.log(`   ${i + 1}. ${subject} (from: ${from}) [ID: ${message.id}]`);
      }

    } catch (error: any) {
      console.error(`❌ Gmail search test failed:`, error.message);
    }
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const tester = new GmailAPITest();

  if (command === 'search') {
    const query = process.argv[3] || 'URGENT';
    await tester.testSearch(query);
  } else {
    await tester.testConnection();
  }
}

if (require.main === module) {
  main();
} 