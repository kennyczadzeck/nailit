#!/usr/bin/env tsx

/**
 * OAuth Separation Setup Script
 * 
 * This script helps you set up proper OAuth separation between:
 * 1. Authentication OAuth (NextAuth) - For web app login
 * 2. Gmail API OAuth - For email access
 */

import fs from 'fs';
import path from 'path';

function setupOAuthSeparation() {
  console.log('🔐 Setting up OAuth Separation');
  console.log('================================\n');

  console.log('📋 Current Issue:');
  console.log('   You are using the same OAuth credentials for both:');
  console.log('   • NextAuth (web app authentication)');
  console.log('   • Gmail API (email access)');
  console.log('   This causes redirect URI conflicts!\n');

  console.log('✅ Solution:');
  console.log('   Create TWO separate OAuth applications in Google Cloud Console\n');

  console.log('🔧 Step 1: Google Cloud Console Setup');
  console.log('======================================');
  
  console.log('\n1️⃣ Authentication OAuth App (for NextAuth):');
  console.log('   Name: Nailit Authentication');
  console.log('   Authorized redirect URIs:');
  console.log('     • http://localhost:3000/api/auth/callback/google');
  console.log('     • https://your-domain.com/api/auth/callback/google');
  console.log('   Scopes: openid, email, profile');
  
  console.log('\n2️⃣ Gmail API OAuth App (for email access):');
  console.log('   Name: Nailit Gmail API');
  console.log('   Authorized redirect URIs:');
  console.log('     • http://localhost:3000/api/email/oauth/gmail/callback');
  console.log('     • https://your-domain.com/api/email/oauth/gmail/callback');
  console.log('   Scopes: https://www.googleapis.com/auth/gmail.readonly');

  console.log('\n🔧 Step 2: Environment Variables');
  console.log('================================');
  
  const envTemplate = `
# Authentication OAuth (NextAuth) - For web app login
GOOGLE_AUTH_CLIENT_ID=your-auth-client-id-here
GOOGLE_AUTH_CLIENT_SECRET=your-auth-client-secret-here

# Gmail API OAuth - For email access
GOOGLE_GMAIL_CLIENT_ID=your-gmail-client-id-here
GOOGLE_GMAIL_CLIENT_SECRET=your-gmail-client-secret-here

# Legacy variables (keep for backward compatibility)
GOOGLE_CLIENT_ID=your-auth-client-id-here
GOOGLE_CLIENT_SECRET=your-auth-client-secret-here

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here
`;

  console.log('\nAdd these to your .env.local:');
  console.log(envTemplate);

  console.log('\n🔧 Step 3: Quick Fix (Temporary)');
  console.log('===============================');
  console.log('For immediate testing, add this redirect URI to your current OAuth app:');
  console.log('   • http://localhost:3000/api/auth/callback/google');
  console.log('\nThis will fix the redirect URI mismatch temporarily.');

  console.log('\n🎯 Step 4: Test the Fix');
  console.log('======================');
  console.log('1. Add the redirect URI to your current OAuth app');
  console.log('2. Try signing in to the web app');
  console.log('3. It should work without redirect URI errors');
  console.log('4. Later, create separate OAuth apps for proper separation');

  console.log('\n🏗️ Architecture Benefits');
  console.log('========================');
  console.log('✅ Clean separation of authentication vs API access');
  console.log('✅ Different users can authenticate with Google but use other email providers');
  console.log('✅ Different users can authenticate with other providers but use Gmail');
  console.log('✅ Independent permission management');
  console.log('✅ Better security (principle of least privilege)');

  console.log('\n🚀 Next Steps');
  console.log('=============');
  console.log('1. Fix redirect URI in current OAuth app (quick fix)');
  console.log('2. Test web app authentication');
  console.log('3. Create separate OAuth apps (proper solution)');
  console.log('4. Update environment variables');
  console.log('5. Test both authentication and Gmail API access');
}

if (require.main === module) {
  setupOAuthSeparation();
}

export { setupOAuthSeparation }; 