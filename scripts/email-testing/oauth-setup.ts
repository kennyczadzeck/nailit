#!/usr/bin/env ts-node

import { config } from 'dotenv';
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from .env.local
config({ path: '.env.local' });

/**
 * OAuth Setup Utility for Email Testing
 * 
 * Sets up OAuth credentials for test Gmail accounts:
 * - nailit.test.contractor@gmail.com (for sending test emails)
 * - nailit.test.homeowner@gmail.com (for receiving test emails)
 */

interface OAuthCredentials {
  client_id: string;
  client_secret: string;
  refresh_token: string;
  access_token?: string;
  expiry_date?: number;
}

const CREDENTIALS_DIR = path.join(__dirname, 'credentials');
const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.compose',
  'https://www.googleapis.com/auth/gmail.modify'
];

class EmailTestOAuth {
  private oauth2Client: any;

  constructor() {
    this.oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_TEST_CLIENT_ID,
      process.env.GMAIL_TEST_CLIENT_SECRET,
      'http://localhost:3001/auth/gmail/callback'
    );
  }

  async setupAccount(accountType: 'contractor' | 'homeowner'): Promise<void> {
    const email = accountType === 'contractor' 
      ? 'nailit.test.contractor@gmail.com'
      : 'nailit.test.homeowner@gmail.com';

    console.log(`\n🔐 Setting up OAuth for ${email}`);

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      login_hint: email
    });

    console.log(`\n📋 Please authorize this app by visiting this URL:`);
    console.log(`${authUrl}\n`);
    console.log(`⚠️  Make sure to sign in as: ${email}`);
    console.log(`\n🔄 After authorization, copy the code and run:`);
    console.log(`npm run test:oauth-callback ${accountType} <authorization_code>`);
  }

  async handleCallback(accountType: 'contractor' | 'homeowner', code: string): Promise<void> {
    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      
      const credentials: OAuthCredentials = {
        client_id: process.env.GMAIL_TEST_CLIENT_ID!,
        client_secret: process.env.GMAIL_TEST_CLIENT_SECRET!,
        refresh_token: tokens.refresh_token!,
        access_token: tokens.access_token,
        expiry_date: tokens.expiry_date
      };

      this.saveCredentials(accountType, credentials);
      console.log(`✅ OAuth setup complete for ${accountType}`);

    } catch (error: any) {
      console.error(`❌ OAuth callback failed:`, error.message);
      throw error;
    }
  }

  getGmailClient(accountType: 'contractor' | 'homeowner') {
    const credentials = this.loadCredentials(accountType);
    if (!credentials) {
      throw new Error(`No credentials found for ${accountType} account`);
    }

    this.oauth2Client.setCredentials({
      refresh_token: credentials.refresh_token,
      access_token: credentials.access_token,
      expiry_date: credentials.expiry_date
    });

    return google.gmail({ version: 'v1', auth: this.oauth2Client });
  }

  /**
   * Test if credentials are valid for an account
   */
  async testCredentials(accountType: 'contractor' | 'homeowner'): Promise<boolean> {
    try {
      const gmail = this.getGmailClient(accountType);
      const profile = await gmail.users.getProfile({ userId: 'me' });
      console.log(`✅ ${accountType} credentials valid for: ${profile.data.emailAddress}`);
      return true;
    } catch (error) {
      console.error(`❌ Invalid credentials for ${accountType}:`, error);
      return false;
    }
  }

  /**
   * Check OAuth status for both accounts
   */
  async checkStatus(): Promise<void> {
    console.log(`\n🔐 OAuth Status Check\n`);

    const accounts: ('contractor' | 'homeowner')[] = ['contractor', 'homeowner'];
    
    for (const account of accounts) {
      const credentialsPath = path.join(CREDENTIALS_DIR, `${account}-credentials.json`);
      
      if (!fs.existsSync(credentialsPath)) {
        console.log(`❌ ${account}: No credentials file found`);
        console.log(`   Run: npm run test:oauth-setup ${account}`);
        continue;
      }

      try {
        const credentials = this.loadCredentials(account);
        if (!credentials) {
          console.log(`❌ ${account}: Invalid credentials file`);
          continue;
        }

        if (credentials.refresh_token === 'test_refresh_token_placeholder') {
          console.log(`⚠️  ${account}: Placeholder credentials detected`);
          console.log(`   Run: npm run test:oauth-setup ${account}`);
          continue;
        }

        const isValid = await this.testCredentials(account);
        if (isValid) {
          console.log(`✅ ${account}: OAuth credentials working`);
        } else {
          console.log(`❌ ${account}: OAuth credentials expired`);
          console.log(`   Run: npm run test:oauth-setup ${account}`);
        }

      } catch (error: any) {
        console.log(`❌ ${account}: Error testing credentials - ${error.message}`);
      }
    }

    console.log(`\n💡 To set up OAuth: npm run test:oauth-setup <contractor|homeowner>`);
  }

  private saveCredentials(accountType: 'contractor' | 'homeowner', credentials: OAuthCredentials): void {
    if (!fs.existsSync(CREDENTIALS_DIR)) {
      fs.mkdirSync(CREDENTIALS_DIR, { recursive: true });
    }

    const credentialsPath = path.join(CREDENTIALS_DIR, `${accountType}-credentials.json`);
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    console.log(`💾 Credentials saved to ${credentialsPath}`);
  }

  private loadCredentials(accountType: 'contractor' | 'homeowner'): OAuthCredentials | null {
    const credentialsPath = path.join(CREDENTIALS_DIR, `${accountType}-credentials.json`);
    if (!fs.existsSync(credentialsPath)) {
      return null;
    }

    try {
      const credentialsJson = fs.readFileSync(credentialsPath, 'utf8');
      return JSON.parse(credentialsJson);
    } catch (error) {
      console.error(`❌ Failed to load credentials:`, error);
      return null;
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const accountType = args[1] as 'contractor' | 'homeowner';
  const authCode = args[2];

  if (!process.env.GMAIL_TEST_CLIENT_ID || !process.env.GMAIL_TEST_CLIENT_SECRET) {
    console.error(`❌ Missing environment variables: GMAIL_TEST_CLIENT_ID, GMAIL_TEST_CLIENT_SECRET`);
    process.exit(1);
  }

  const oauth = new EmailTestOAuth();

  switch (command) {
    case 'setup':
      if (!accountType) {
        console.error(`❌ Account type required: contractor or homeowner`);
        process.exit(1);
      }
      await oauth.setupAccount(accountType);
      break;
    case 'callback':
      if (!accountType || !authCode) {
        console.error(`❌ Account type and auth code required`);
        process.exit(1);
      }
      await oauth.handleCallback(accountType, authCode);
      break;
    case 'status':
      await oauth.checkStatus();
      break;
    default:
      console.log(`\n🔐 OAuth Setup for Email Testing\n`);
      console.log(`Usage:`);
      console.log(`  npm run test:oauth-status                    # Check OAuth status`);
      console.log(`  npm run test:oauth-setup <contractor|homeowner>`);
      console.log(`  npm run test:oauth-callback <contractor|homeowner> <code>`);
      console.log(`\nExample:`);
      console.log(`  npm run test:oauth-setup contractor`);
  }
}

if (require.main === module) {
  main();
}

export { EmailTestOAuth };
