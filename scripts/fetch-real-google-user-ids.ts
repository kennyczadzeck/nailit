#!/usr/bin/env tsx

/**
 * Fetch Real Google User IDs and Update Account Records
 * 
 * This script:
 * 1. Uses existing Gmail OAuth sessions to get real Google user IDs
 * 2. Updates NextAuth.js Account records with real Google user IDs
 * 3. Fixes the OAuthAccountNotLinked error
 */

import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  picture?: string;
  verified_email: boolean;
}

async function fetchRealGoogleUserIds() {
  console.log('🔍 Fetching Real Google User IDs from Gmail API...\n');
  
  try {
    // 1. Check existing Account records
    console.log('📊 **Step 1: Checking existing Account records...**');
    
    const accounts = await prisma.account.findMany({
      where: { provider: 'google' },
      include: { user: true }
    });
    
    console.log(`Found ${accounts.length} Google Account records`);
    
    if (accounts.length === 0) {
      console.log('❌ No Google Account records found. Run enhanced-e2e-setup.ts first.');
      return;
    }
    
    // 2. Look for Gmail OAuth credentials
    console.log('\n🔑 **Step 2: Looking for Gmail OAuth credentials...**');
    
    const credentialsPath = path.join(process.cwd(), 'scripts/email-testing/credentials');
    const testEmails = ['nailit.test.homeowner@gmail.com', 'nailit.test.contractor@gmail.com'];
    
    const updates = [];
    
    for (const email of testEmails) {
      // Use the correct credential file names
      const credentialFileName = email.includes('homeowner') ? 'homeowner-credentials.json' : 'contractor-credentials.json';
      const tokenPath = path.join(credentialsPath, credentialFileName);
      
      if (fs.existsSync(tokenPath)) {
        console.log(`   ✅ Found credentials for ${email}`);
        
        try {
          // Read OAuth tokens
          const tokens = JSON.parse(fs.readFileSync(tokenPath, 'utf8'));
          
          // Set up OAuth2 client
          const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_GMAIL_CLIENT_ID,
            process.env.GOOGLE_GMAIL_CLIENT_SECRET,
            'http://localhost:8080/oauth/callback'
          );
          
          oauth2Client.setCredentials(tokens);
          
          // Get user info from OAuth2 API (this is what NextAuth.js uses)
          const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
          const userInfo = await oauth2.userinfo.get();
          
          const googleProfile: GoogleUserProfile = {
            id: userInfo.data.id!,
            email: userInfo.data.email!,
            name: userInfo.data.name!,
            picture: userInfo.data.picture,
            verified_email: userInfo.data.verified_email!
          };
          
          console.log(`   📋 Google User Profile for ${email}:`);
          console.log(`      ID: ${googleProfile.id}`);
          console.log(`      Email: ${googleProfile.email}`);
          console.log(`      Name: ${googleProfile.name}`);
          console.log(`      Verified: ${googleProfile.verified_email}`);
          
          // Find matching Account record
          const matchingAccount = accounts.find(acc => acc.user.email === email);
          
          if (matchingAccount) {
            updates.push({
              accountId: matchingAccount.id,
              currentProviderId: matchingAccount.providerAccountId,
              newProviderId: googleProfile.id,
              email: email,
              tokens: tokens
            });
            
            console.log(`   ✅ Found matching Account record (ID: ${matchingAccount.id})`);
            console.log(`   🔄 Will update providerAccountId: ${matchingAccount.providerAccountId} → ${googleProfile.id}`);
          } else {
            console.log(`   ❌ No matching Account record found for ${email}`);
          }
          
        } catch (error) {
          console.log(`   ❌ Error processing ${email}: ${error}`);
          console.log(`   📋 Error details:`, error);
          
          // Try to refresh token if it's expired
          if (error.message?.includes('invalid_grant') || error.message?.includes('invalid_request')) {
            console.log(`   🔄 Attempting to refresh token...`);
            try {
              const refreshedTokens = await oauth2Client.refreshAccessToken();
              console.log(`   ✅ Token refreshed successfully`);
              
              // Update the credential file with new tokens
              const updatedTokens = {
                ...tokens,
                access_token: refreshedTokens.credentials.access_token,
                expiry_date: refreshedTokens.credentials.expiry_date
              };
              
              fs.writeFileSync(tokenPath, JSON.stringify(updatedTokens, null, 2));
              console.log(`   ✅ Updated credential file with new tokens`);
              
              // Retry the user info request
              const oauth2Retry = google.oauth2({ version: 'v2', auth: oauth2Client });
              const userInfoRetry = await oauth2Retry.userinfo.get();
              
              const googleProfile: GoogleUserProfile = {
                id: userInfoRetry.data.id!,
                email: userInfoRetry.data.email!,
                name: userInfoRetry.data.name!,
                picture: userInfoRetry.data.picture,
                verified_email: userInfoRetry.data.verified_email!
              };
              
              console.log(`   📋 Google User Profile for ${email} (after refresh):`);
              console.log(`      ID: ${googleProfile.id}`);
              console.log(`      Email: ${googleProfile.email}`);
              console.log(`      Name: ${googleProfile.name}`);
              console.log(`      Verified: ${googleProfile.verified_email}`);
              
              // Find matching Account record
              const matchingAccount = accounts.find(acc => acc.user.email === email);
              
              if (matchingAccount) {
                updates.push({
                  accountId: matchingAccount.id,
                  currentProviderId: matchingAccount.providerAccountId,
                  newProviderId: googleProfile.id,
                  email: email,
                  tokens: updatedTokens
                });
                
                console.log(`   ✅ Found matching Account record (ID: ${matchingAccount.id})`);
                console.log(`   🔄 Will update providerAccountId: ${matchingAccount.providerAccountId} → ${googleProfile.id}`);
              } else {
                console.log(`   ❌ No matching Account record found for ${email}`);
              }
              
            } catch (refreshError) {
              console.log(`   ❌ Token refresh failed: ${refreshError}`);
              console.log(`   💡 You may need to re-authenticate this account`);
            }
          }
        }
      } else {
        console.log(`   ❌ No credentials found for ${email} at ${tokenPath}`);
      }
    }
    
    // 3. Update Account records with real Google user IDs
    console.log('\n🔄 **Step 3: Updating Account records with real Google user IDs...**');
    
    if (updates.length === 0) {
      console.log('❌ No updates to perform. Make sure Gmail OAuth credentials exist.');
      return;
    }
    
    for (const update of updates) {
      try {
        await prisma.account.update({
          where: { id: update.accountId },
          data: {
            providerAccountId: update.newProviderId,
            access_token: update.tokens.access_token,
            refresh_token: update.tokens.refresh_token,
            expires_at: update.tokens.expiry_date ? Math.floor(update.tokens.expiry_date / 1000) : null,
            token_type: update.tokens.token_type || 'Bearer',
            scope: update.tokens.scope || 'openid email profile'
          }
        });
        
        console.log(`   ✅ Updated Account record for ${update.email}`);
        console.log(`      Provider Account ID: ${update.newProviderId}`);
        console.log(`      Access Token: ${update.tokens.access_token ? 'Updated' : 'Not available'}`);
        console.log(`      Refresh Token: ${update.tokens.refresh_token ? 'Updated' : 'Not available'}`);
        
      } catch (error) {
        console.log(`   ❌ Error updating Account record for ${update.email}: ${error}`);
      }
    }
    
    // 4. Create Gmail OAuth sessions for email ingestion
    console.log('\n📧 **Step 4: Creating Gmail OAuth sessions for email ingestion...**');
    
    for (const update of updates) {
      try {
        // Find the user
        const user = await prisma.user.findUnique({
          where: { email: update.email }
        });
        
        if (!user) {
          console.log(`   ❌ User not found for ${update.email}`);
          continue;
        }
        
        // Create or update OAuth session
        const oauthSession = await prisma.oAuthSession.upsert({
          where: {
            userId_provider_sessionContext: {
              userId: user.id,
              provider: 'google',
              sessionContext: 'gmail-api'
            }
          },
          update: {
            providerAccountId: update.newProviderId,
            accessToken: update.tokens.access_token,
            refreshToken: update.tokens.refresh_token,
            expiresAt: update.tokens.expiry_date ? new Date(update.tokens.expiry_date) : null,
            scopes: update.tokens.scope ? update.tokens.scope.split(' ') : ['https://www.googleapis.com/auth/gmail.readonly'],
            lastUsedAt: new Date()
          },
          create: {
            userId: user.id,
            provider: 'google',
            sessionContext: 'gmail-api',
            sessionPurpose: 'email-ingestion',
            providerAccountId: update.newProviderId,
            accessToken: update.tokens.access_token,
            refreshToken: update.tokens.refresh_token,
            expiresAt: update.tokens.expiry_date ? new Date(update.tokens.expiry_date) : null,
            scopes: update.tokens.scope ? update.tokens.scope.split(' ') : ['https://www.googleapis.com/auth/gmail.readonly'],
            lastUsedAt: new Date()
          }
        });
        
        console.log(`   ✅ Created/Updated Gmail OAuth session for ${update.email}`);
        console.log(`      Session ID: ${oauthSession.id}`);
        
      } catch (error) {
        console.log(`   ❌ Error creating Gmail OAuth session for ${update.email}: ${error}`);
      }
    }
    
    // 5. Verification
    console.log('\n✅ **Step 5: Verification...**');
    
    const updatedAccounts = await prisma.account.findMany({
      where: { provider: 'google' },
      include: { user: true }
    });
    
    console.log('\n📊 **Updated Account Records:**');
    updatedAccounts.forEach((account, index) => {
      console.log(`\n${index + 1}. Account ID: ${account.id}`);
      console.log(`   User Email: ${account.user.email}`);
      console.log(`   Provider Account ID: ${account.providerAccountId}`);
      console.log(`   Has Real Google ID: ${account.providerAccountId.match(/^\d+$/) ? 'Yes' : 'No'}`);
      console.log(`   Has Access Token: ${account.access_token ? 'Yes' : 'No'}`);
      console.log(`   Has Refresh Token: ${account.refresh_token ? 'Yes' : 'No'}`);
    });
    
    const oauthSessions = await prisma.oAuthSession.findMany({
      include: { user: true }
    });
    
    console.log(`\n📧 **Gmail OAuth Sessions:** ${oauthSessions.length} found`);
    
    console.log('\n🎉 **OAuth Account Linking Fix Complete!**');
    console.log(`
📋 **Summary:**
- Account records updated: ${updates.length}
- Gmail OAuth sessions created: ${updates.length}
- Real Google user IDs now linked to NextAuth.js accounts

🧪 **Next Steps:**
1. Test login at: https://u9eack5h4f.us-east-1.awsapprunner.com/auth/signin
2. Verify OAuthAccountNotLinked error is resolved
3. Run E2E email testing to confirm email ingestion works
`);
    
  } catch (error) {
    console.error('❌ Error fetching real Google user IDs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fetchRealGoogleUserIds(); 