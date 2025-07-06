#!/usr/bin/env tsx

/**
 * Get Google User IDs from Working OAuth Credentials
 * 
 * This script uses the working OAuth credentials to get real Google user IDs
 * and shows what they should be for the Account records.
 */

import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

async function getGoogleUserIds() {
  console.log('🔍 Getting Google User IDs from OAuth Credentials...\n');
  
  const credentialsPath = path.join(process.cwd(), 'scripts/email-testing/credentials');
  const accounts = [
    {
      name: 'Homeowner',
      email: 'nailit.test.homeowner@gmail.com',
      file: 'homeowner-credentials.json'
    },
    {
      name: 'Contractor', 
      email: 'nailit.test.contractor@gmail.com',
      file: 'contractor-credentials.json'
    }
  ];
  
  const results = [];
  
  for (const account of accounts) {
    const tokenPath = path.join(credentialsPath, account.file);
    
    if (fs.existsSync(tokenPath)) {
      try {
        console.log(`📋 Processing ${account.name} (${account.email})...`);
        
        // Read OAuth tokens
        const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
        
        // Set up OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_GMAIL_CLIENT_ID,
          process.env.GOOGLE_GMAIL_CLIENT_SECRET,
          'http://localhost:8080/oauth/callback'
        );
        
        oauth2Client.setCredentials(tokens);
        
        // Get user info from OAuth2 API
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        console.log(`   ✅ Google User ID: ${userInfo.data.id}`);
        console.log(`   📧 Email: ${userInfo.data.email}`);
        console.log(`   👤 Name: ${userInfo.data.name}`);
        console.log(`   ✓ Verified: ${userInfo.data.verified_email}`);
        
        results.push({
          account: account.name,
          email: account.email,
          googleUserId: userInfo.data.id,
          googleEmail: userInfo.data.email,
          name: userInfo.data.name
        });
        
      } catch (error) {
        console.log(`   ❌ Error processing ${account.name}: ${error.message}`);
      }
    } else {
      console.log(`   ❌ Credentials not found for ${account.name}`);
    }
    
    console.log('');
  }
  
  // Show SQL commands to update Account records
  console.log('🔧 **SQL Commands to Update Account Records:**\n');
  
  for (const result of results) {
    console.log(`-- Update ${result.account} Account record`);
    console.log(`UPDATE "Account" SET "providerAccountId" = '${result.googleUserId}' WHERE "provider" = 'google' AND "user"."email" = '${result.email}';`);
    console.log('');
  }
  
  console.log('🎯 **Next Steps:**');
  console.log('1. Run the SQL commands above to update Account records');
  console.log('2. Test login at the App Runner URL');
  console.log('3. Verify OAuthAccountNotLinked error is resolved');
  
  return results;
}

// Only run if called directly
if (require.main === module) {
  getGoogleUserIds().catch(console.error);
}

export { getGoogleUserIds }; 