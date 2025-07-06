#!/usr/bin/env tsx

/**
 * Get Google User IDs from OAuth Setup Framework
 * 
 * This script uses the existing OAuth setup framework to get real Google user IDs
 * from the OAuth2 API and shows the SQL commands to update Account records.
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

interface AccountConfig {
  name: string;
  email: string;
  purpose: string;
  allowedScopes: string[];
  requiredScopes: string[];
  credentialsFile: string;
}

class GoogleUserIdExtractor {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;
  
  private readonly accountConfigs: Record<string, AccountConfig> = {
    homeowner: {
      name: 'Homeowner (Primary Ingestion Account)',
      email: 'nailit.test.homeowner@gmail.com',
      purpose: 'Email ingestion and processing (FULL Gmail access)',
      allowedScopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid'
      ],
      requiredScopes: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/gmail.modify'
      ],
      credentialsFile: 'homeowner-credentials.json'
    },
    contractor: {
      name: 'Contractor (Send-Only Account)',
      email: 'nailit.test.contractor@gmail.com',
      purpose: 'Send test emails TO homeowner (LIMITED Gmail access)',
      allowedScopes: [
        'https://www.googleapis.com/auth/gmail.send',
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile',
        'openid'
      ],
      requiredScopes: [
        'https://www.googleapis.com/auth/gmail.send'
      ],
      credentialsFile: 'contractor-credentials.json'
    }
  };

  constructor() {
    this.clientId = process.env.GOOGLE_GMAIL_CLIENT_ID!;
    this.clientSecret = process.env.GOOGLE_GMAIL_CLIENT_SECRET!;
    this.redirectUri = 'http://localhost:8080/oauth/callback';
    
    if (!this.clientId || !this.clientSecret) {
      throw new Error('Missing Gmail OAuth credentials in environment variables (GOOGLE_GMAIL_CLIENT_ID, GOOGLE_GMAIL_CLIENT_SECRET)');
    }
  }

  /**
   * Get Google User IDs for all accounts
   */
  async getGoogleUserIds(): Promise<void> {
    console.log('🔍 Getting Google User IDs from OAuth Credentials...\n');
    
    const results = [];
    
    for (const [accountType, config] of Object.entries(this.accountConfigs)) {
      console.log(`📋 Processing ${config.name}...`);
      
      const credentialsPath = path.join(__dirname, 'email-testing/credentials', config.credentialsFile);
      
      if (!fs.existsSync(credentialsPath)) {
        console.log(`   ❌ No credentials found for ${config.name}`);
        continue;
      }

      try {
        const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
        
        if (!credentials.refresh_token) {
          console.log(`   ❌ Invalid credentials for ${config.name} (missing refresh token)`);
          continue;
        }

        const oauth2Client = new google.auth.OAuth2(
          this.clientId,
          this.clientSecret,
          this.redirectUri
        );

        oauth2Client.setCredentials(credentials);

        // Get user info from OAuth2 API (this is what NextAuth.js uses)
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        console.log(`   ✅ Google User ID: ${userInfo.data.id}`);
        console.log(`   📧 Email: ${userInfo.data.email}`);
        console.log(`   👤 Name: ${userInfo.data.name}`);
        console.log(`   ✓ Verified: ${userInfo.data.verified_email}`);
        
        results.push({
          accountType,
          config,
          googleUserId: userInfo.data.id,
          googleEmail: userInfo.data.email,
          name: userInfo.data.name,
          verified: userInfo.data.verified_email
        });
        
      } catch (error: any) {
        console.log(`   ❌ Error processing ${config.name}: ${error.message}`);
      }
      
      console.log('');
    }
    
    if (results.length === 0) {
      console.log('❌ No Google User IDs could be extracted. Check OAuth credentials.');
      return;
    }
    
    // Show SQL commands to update Account records
    console.log('🔧 **SQL Commands to Update Account Records:**\n');
    
    for (const result of results) {
      console.log(`-- Update ${result.config.name} Account record`);
      console.log(`UPDATE "Account" SET "providerAccountId" = '${result.googleUserId}' WHERE "provider" = 'google' AND "user"."email" = '${result.googleEmail}';`);
      console.log('');
    }
    
    console.log('🎯 **Next Steps:**');
    console.log('1. Run the SQL commands above to update Account records');
    console.log('2. Test login at: https://u9eack5h4f.us-east-1.awsapprunner.com/auth/signin');
    console.log('3. Verify OAuthAccountNotLinked error is resolved');
    console.log('4. Run E2E email testing to confirm email ingestion works');
    
    console.log('\n📊 **Summary:**');
    console.log(`- Google User IDs extracted: ${results.length}`);
    console.log(`- Accounts ready for OAuth linking: ${results.length}`);
    
    return;
  }
}

async function main() {
  try {
    const extractor = new GoogleUserIdExtractor();
    await extractor.getGoogleUserIds();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main(); 