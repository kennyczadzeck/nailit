#!/usr/bin/env tsx

/**
 * Diagnose OAuth Configuration for App Runner Environment
 * 
 * This script checks the OAuth configuration and identifies
 * what needs to be updated for the App Runner environment
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function diagnoseOAuthAppRunner() {
  console.log('🔍 Diagnosing OAuth Configuration for App Runner Environment...\n');
  
  try {
    // Check current environment variables
    console.log('📊 Current Environment Configuration:');
    console.log(`- NEXTAUTH_URL: ${process.env.NEXTAUTH_URL || 'NOT SET'}`);
    console.log(`- GOOGLE_CLIENT_ID: ${process.env.GOOGLE_CLIENT_ID || 'NOT SET'}`);
    console.log(`- GOOGLE_CLIENT_SECRET: ${process.env.GOOGLE_CLIENT_SECRET ? '***SET***' : 'NOT SET'}`);
    console.log(`- DATABASE_URL: ${process.env.DATABASE_URL?.includes('still-paper') ? 'Development DB' : 'Unknown DB'}\n`);
    
    // Check database OAuth accounts
    console.log('🔍 Checking Database OAuth Accounts:');
    const testEmails = [
      'nailit.test.homeowner@gmail.com',
      'nailit.test.contractor@gmail.com'
    ];
    
    for (const email of testEmails) {
      const user = await prisma.user.findUnique({
        where: { email },
        include: { 
          accounts: {
            select: {
              provider: true,
              providerAccountId: true,
              type: true,
              access_token: true,
              expires_at: true
            }
          }
        }
      });
      
      if (user) {
        console.log(`📧 ${email}:`);
        console.log(`   - User ID: ${user.id}`);
        console.log(`   - OAuth Accounts: ${user.accounts.length}`);
        user.accounts.forEach(account => {
          console.log(`   - Provider: ${account.provider}`);
          console.log(`   - Account ID: ${account.providerAccountId}`);
          console.log(`   - Type: ${account.type}`);
          console.log(`   - Has Token: ${account.access_token ? 'Yes' : 'No'}`);
          console.log(`   - Expires: ${account.expires_at ? new Date(account.expires_at * 1000).toISOString() : 'Never'}`);
        });
      } else {
        console.log(`📧 ${email}: NOT FOUND`);
      }
      console.log('');
    }
    
    // Expected OAuth Configuration for App Runner
    console.log('🎯 Expected OAuth Configuration for App Runner:');
    console.log('');
    console.log('🔧 Google Cloud Console Settings:');
    console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
    console.log('2. Find your OAuth 2.0 Client ID');
    console.log('3. Add these Authorized Redirect URIs:');
    console.log('   - https://u9eack5h4f.us-east-1.awsapprunner.com/api/auth/callback/google');
    console.log('   - http://localhost:3000/api/auth/callback/google (for local dev)');
    console.log('');
    
    console.log('🔧 App Runner Environment Variables:');
    console.log('1. Go to: AWS App Runner Console');
    console.log('2. Find your service: nailit-dev');
    console.log('3. Go to Configuration → Environment variables');
    console.log('4. Ensure these are set:');
    console.log('   - NEXTAUTH_URL=https://u9eack5h4f.us-east-1.awsapprunner.com');
    console.log('   - GOOGLE_CLIENT_ID=[your-google-client-id]');
    console.log('   - GOOGLE_CLIENT_SECRET=[your-google-client-secret]');
    console.log('   - DATABASE_URL=[development-database-url]');
    console.log('');
    
    // Check if OAuth redirect URI is the issue
    console.log('🚨 Most Likely Issue:');
    console.log('The OAuth redirect URI in Google Cloud Console does not include:');
    console.log('https://u9eack5h4f.us-east-1.awsapprunner.com/api/auth/callback/google');
    console.log('');
    console.log('This causes the "OAuthAccountNotLinked" error because:');
    console.log('1. Google OAuth succeeds but returns to wrong URL');
    console.log('2. NextAuth.js cannot complete the OAuth flow');
    console.log('3. User exists in database but OAuth account linking fails');
    console.log('');
    
    console.log('✅ Fix Steps:');
    console.log('1. Add the App Runner callback URL to Google Cloud Console');
    console.log('2. Wait 5-10 minutes for Google to propagate changes');
    console.log('3. Try signing in again at: https://u9eack5h4f.us-east-1.awsapprunner.com/auth/signin');
    
  } catch (error) {
    console.error('❌ Error diagnosing OAuth configuration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnosis
diagnoseOAuthAppRunner().catch(console.error); 