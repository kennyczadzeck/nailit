#!/usr/bin/env tsx

/**
 * Investigate Google User ID Mapping
 * 
 * This script checks what user identifiers are used by:
 * 1. Gmail API OAuth flow (used in E2E testing)
 * 2. NextAuth.js OAuth flow (used for web authentication)
 * 3. Existing Account records in database
 */

import { PrismaClient } from '@prisma/client';
import { google } from 'googleapis';

const prisma = new PrismaClient();

async function investigateGoogleUserIds() {
  console.log('🔍 Investigating Google User ID Mapping...\n');
  
  try {
    // 1. Check existing Account records in database
    console.log('📊 **Existing Account Records in Database:**');
    const accounts = await prisma.account.findMany({
      where: { provider: 'google' },
      include: { user: true }
    });
    
    if (accounts.length === 0) {
      console.log('❌ No Google OAuth accounts found in database');
    } else {
      accounts.forEach((account, index) => {
        console.log(`\n${index + 1}. Account ID: ${account.id}`);
        console.log(`   User Email: ${account.user.email}`);
        console.log(`   Provider Account ID: ${account.providerAccountId}`);
        console.log(`   Type: ${account.type}`);
        console.log(`   Has Access Token: ${account.access_token ? 'Yes' : 'No'}`);
        console.log(`   Has Refresh Token: ${account.refresh_token ? 'Yes' : 'No'}`);
        console.log(`   User Created: ${account.user.createdAt?.toISOString() || 'Not available'}`);
      });
    }
    
    // 2. Check Gmail API OAuth sessions
    console.log('\n\n📧 **Gmail API OAuth Sessions:**');
    const oauthSessions = await prisma.oAuthSession.findMany({
      include: { user: true }
    });
    
    if (oauthSessions.length === 0) {
      console.log('❌ No Gmail OAuth sessions found in database');
    } else {
      oauthSessions.forEach((session, index) => {
        console.log(`\n${index + 1}. OAuth Session ID: ${session.id}`);
        console.log(`   User Email: ${session.user.email}`);
        console.log(`   Has Access Token: ${session.accessToken ? 'Yes' : 'No'}`);
        console.log(`   Has Refresh Token: ${session.refreshToken ? 'Yes' : 'No'}`);
        console.log(`   Token Expiry: ${session.tokenExpiry?.toISOString() || 'Not set'}`);
        console.log(`   Created: ${session.createdAt?.toISOString() || 'Not available'}`);
      });
    }
    
    // 3. Test Gmail API user profile retrieval
    console.log('\n\n🔑 **Gmail API User Profile Test:**');
    
    // Find a valid Gmail OAuth session to test with
    const validSession = oauthSessions.find(s => s.accessToken);
    
    if (validSession) {
      try {
        console.log(`Testing with session for: ${validSession.user.email}`);
        
        // Set up OAuth2 client
        const oauth2Client = new google.auth.OAuth2(
          process.env.GOOGLE_GMAIL_CLIENT_ID,
          process.env.GOOGLE_GMAIL_CLIENT_SECRET,
          'http://localhost:8080/oauth/callback'
        );
        
        oauth2Client.setCredentials({
          access_token: validSession.accessToken,
          refresh_token: validSession.refreshToken
        });
        
        // Get user profile from Gmail API
        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const profile = await gmail.users.getProfile({ userId: 'me' });
        
        console.log(`✅ Gmail API User Profile:`);
        console.log(`   Email Address: ${profile.data.emailAddress}`);
        console.log(`   Messages Total: ${profile.data.messagesTotal}`);
        console.log(`   Threads Total: ${profile.data.threadsTotal}`);
        console.log(`   History ID: ${profile.data.historyId}`);
        
        // Get user info from OAuth2 API (this is what NextAuth.js typically uses)
        const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
        const userInfo = await oauth2.userinfo.get();
        
        console.log(`\n✅ OAuth2 User Info (NextAuth.js style):`);
        console.log(`   ID: ${userInfo.data.id}`);
        console.log(`   Email: ${userInfo.data.email}`);
        console.log(`   Name: ${userInfo.data.name}`);
        console.log(`   Picture: ${userInfo.data.picture}`);
        console.log(`   Verified Email: ${userInfo.data.verified_email}`);
        
        // 4. Compare identifiers
        console.log('\n\n🎯 **Identifier Comparison:**');
        console.log(`Gmail Profile Email: ${profile.data.emailAddress}`);
        console.log(`OAuth2 User ID: ${userInfo.data.id}`);
        console.log(`OAuth2 User Email: ${userInfo.data.email}`);
        
        // Check if we have a matching Account record
        const matchingAccount = accounts.find(acc => 
          acc.providerAccountId === userInfo.data.id || 
          acc.user.email === userInfo.data.email
        );
        
        if (matchingAccount) {
          console.log(`✅ Found matching Account record:`);
          console.log(`   Provider Account ID: ${matchingAccount.providerAccountId}`);
          console.log(`   Matches OAuth2 ID: ${matchingAccount.providerAccountId === userInfo.data.id}`);
        } else {
          console.log(`❌ No matching Account record found`);
          console.log(`   This explains the OAuthAccountNotLinked error!`);
        }
        
      } catch (error) {
        console.log(`❌ Error testing Gmail API: ${error}`);
      }
    } else {
      console.log('❌ No valid Gmail OAuth session found to test with');
    }
    
    // 5. Summary and recommendations
    console.log('\n\n📋 **Summary & Recommendations:**');
    console.log(`Total Google Accounts in DB: ${accounts.length}`);
    console.log(`Total Gmail OAuth Sessions: ${oauthSessions.length}`);
    
    if (accounts.length === 0 && oauthSessions.length > 0) {
      console.log('\n🚨 **Issue Identified:**');
      console.log('- Gmail OAuth sessions exist (for email access)');
      console.log('- But no NextAuth.js Account records exist (for web login)');
      console.log('- This causes OAuthAccountNotLinked error');
      
      console.log('\n💡 **Next Steps:**');
      console.log('1. Create User + Account records for existing Gmail OAuth sessions');
      console.log('2. Ensure providerAccountId matches Google OAuth2 user ID');
      console.log('3. Update E2E test setup to create both record types');
    }
    
  } catch (error) {
    console.error('❌ Error investigating Google User IDs:', error);
  } finally {
    await prisma.$disconnect();
  }
}

investigateGoogleUserIds(); 