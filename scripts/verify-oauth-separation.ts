#!/usr/bin/env tsx

import { config } from 'dotenv';

// Load environment variables from .env.local
config({ path: '.env.local' });

/**
 * Verify OAuth Separation
 * 
 * This script verifies that the OAuth separation is working correctly
 */

function verifyOAuthSeparation() {
  console.log('🔐 Verifying OAuth Separation');
  console.log('=============================\n');

  // Check environment variables
  const authClientId = process.env.GOOGLE_CLIENT_ID;
  const authClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const gmailClientId = process.env.GOOGLE_GMAIL_CLIENT_ID;
  const gmailClientSecret = process.env.GOOGLE_GMAIL_CLIENT_SECRET;

  console.log('📋 Environment Variables:');
  console.log(`   GOOGLE_CLIENT_ID: ${authClientId ? authClientId.slice(0, 20) + '...' : '❌ NOT SET'}`);
  console.log(`   GOOGLE_CLIENT_SECRET: ${authClientSecret ? '✅ SET' : '❌ NOT SET'}`);
  console.log(`   GOOGLE_GMAIL_CLIENT_ID: ${gmailClientId ? gmailClientId.slice(0, 20) + '...' : '❌ NOT SET'}`);
  console.log(`   GOOGLE_GMAIL_CLIENT_SECRET: ${gmailClientSecret ? '✅ SET' : '❌ NOT SET'}`);

  console.log('\n🔍 OAuth Client Separation:');
  
  if (authClientId && gmailClientId) {
    if (authClientId === gmailClientId) {
      console.log('   ❌ PROBLEM: Same client ID for both OAuth purposes');
      console.log('   ❌ This will cause redirect URI conflicts');
    } else {
      console.log('   ✅ Different client IDs - OAuth separation is correct');
    }
  } else {
    console.log('   ❌ Missing client IDs - cannot verify separation');
  }

  console.log('\n🎯 OAuth Flow Configuration:');
  
  console.log('\n1️⃣ Authentication OAuth (NextAuth):');
  console.log(`   Client ID: ${authClientId ? authClientId.slice(0, 20) + '...' : 'NOT SET'}`);
  console.log('   Purpose: User signs in to web/mobile app');
  console.log('   Redirect URI: http://localhost:3000/api/auth/callback/google');
  console.log('   Scopes: openid email profile');
  console.log(`   Status: ${authClientId && authClientSecret ? '✅ Ready' : '❌ Missing credentials'}`);
  
  console.log('\n2️⃣ Gmail API OAuth:');
  console.log(`   Client ID: ${gmailClientId ? gmailClientId.slice(0, 20) + '...' : 'NOT SET'}`);
  console.log('   Purpose: Access user\'s Gmail for email processing');
  console.log('   Redirect URI: http://localhost:3000/api/email/oauth/gmail/callback');
  console.log('   Scopes: gmail.readonly, gmail.metadata');
  console.log(`   Status: ${gmailClientId && gmailClientSecret ? '✅ Ready' : '❌ Missing credentials'}`);

  console.log('\n🚀 Next Steps:');
  
  if (authClientId && authClientSecret && gmailClientId && gmailClientSecret) {
    if (authClientId !== gmailClientId) {
      console.log('✅ OAuth separation is configured correctly!');
      console.log('\n🎯 You can now:');
      console.log('   1. Test web app authentication: http://localhost:3000/auth/signin');
      console.log('   2. Test Gmail API OAuth (when connecting Gmail to a project)');
      console.log('   3. Both OAuth flows will work independently');
    } else {
      console.log('❌ Fix required: Use different client IDs for each OAuth purpose');
      console.log('\n📋 Action items:');
      console.log('   1. Get CLIENT_ID from your Authentication OAuth client');
      console.log('   2. Get CLIENT_ID from your Gmail API OAuth client');
      console.log('   3. Update .env.local with DIFFERENT client IDs');
      console.log('   4. Restart dev server');
    }
  } else {
    console.log('❌ Missing OAuth credentials');
    console.log('\n📋 Action items:');
    console.log('   1. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET (authentication)');
    console.log('   2. Set GOOGLE_GMAIL_CLIENT_ID and GOOGLE_GMAIL_CLIENT_SECRET (Gmail API)');
    console.log('   3. Restart dev server');
  }

  console.log('\n🏗️ Architecture Benefits:');
  console.log('✅ Clean separation of authentication vs API access');
  console.log('✅ Users can authenticate with Google but use other email providers');
  console.log('✅ Users can authenticate with other providers but use Gmail');
  console.log('✅ Independent permission management');
  console.log('✅ Better security (principle of least privilege)');
}

if (require.main === module) {
  verifyOAuthSeparation();
}

export { verifyOAuthSeparation }; 