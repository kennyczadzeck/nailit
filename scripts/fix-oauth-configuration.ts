#!/usr/bin/env tsx

/**
 * Fix OAuth Configuration - Action Plan
 * 
 * This script provides the exact steps to fix your OAuth setup
 */

function fixOAuthConfiguration() {
  console.log('🔧 Fix OAuth Configuration - Action Plan');
  console.log('=========================================\n');

  console.log('📋 Current Problem:');
  console.log('   You have TWO separate OAuth clients in GCP, but:');
  console.log('   • Both GOOGLE_CLIENT_ID and GMAIL_TEST_CLIENT_ID have the SAME value');
  console.log('   • This causes redirect URI conflicts');
  console.log('   • Code is using wrong OAuth client for Gmail API\n');

  console.log('✅ Solution: Use the CORRECT OAuth client for each purpose\n');

  console.log('🔧 Step 1: Update .env.local');
  console.log('============================');
  
  console.log('\nYou need to get the CLIENT_ID and CLIENT_SECRET from your TWO separate OAuth clients:');
  
  console.log('\n📱 Authentication OAuth Client:');
  console.log('   Purpose: NextAuth (web app login)');
  console.log('   Redirect URI: http://localhost:3000/api/auth/callback/google');
  console.log('   ↓ Copy CLIENT_ID and CLIENT_SECRET from this OAuth client');
  
  console.log('\n📧 Gmail API OAuth Client:');
  console.log('   Purpose: Gmail API access');
  console.log('   Redirect URI: http://localhost:3000/api/email/oauth/gmail/callback');
  console.log('   ↓ Copy CLIENT_ID and CLIENT_SECRET from this OAuth client');

  console.log('\n💾 Update your .env.local:');
  const envExample = `
# Authentication OAuth (NextAuth) - Use AUTH OAuth client credentials
GOOGLE_CLIENT_ID=your-auth-oauth-client-id-here
GOOGLE_CLIENT_SECRET=your-auth-oauth-client-secret-here

# Gmail API OAuth - Use GMAIL OAuth client credentials  
GOOGLE_GMAIL_CLIENT_ID=your-gmail-oauth-client-id-here
GOOGLE_GMAIL_CLIENT_SECRET=your-gmail-oauth-client-secret-here

# Legacy (keep for backward compatibility)
GMAIL_TEST_CLIENT_ID=your-gmail-oauth-client-id-here
GMAIL_TEST_CLIENT_SECRET=your-gmail-oauth-client-secret-here

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-here
`;
  console.log(envExample);

  console.log('🔧 Step 2: Verify GCP OAuth Clients');
  console.log('===================================');
  
  console.log('\nGo to Google Cloud Console > APIs & Credentials > OAuth 2.0 Client IDs');
  console.log('\nMake sure you have TWO clients with DIFFERENT redirect URIs:');
  
  console.log('\n📱 Authentication Client:');
  console.log('   ✅ Redirect URI: http://localhost:3000/api/auth/callback/google');
  
  console.log('\n📧 Gmail API Client:');
  console.log('   ✅ Redirect URI: http://localhost:3000/api/email/oauth/gmail/callback');

  console.log('\n🔧 Step 3: Code Updates (Already Done)');
  console.log('=====================================');
  
  console.log('\n✅ Updated files to use proper OAuth clients:');
  console.log('   • app/lib/gmail-email-fetcher.ts - Uses GOOGLE_GMAIL_CLIENT_ID');
  console.log('   • app/api/email/oauth/gmail/route.ts - Uses GOOGLE_GMAIL_CLIENT_ID');
  console.log('   • app/api/email/oauth/gmail/callback/route.ts - Uses GOOGLE_GMAIL_CLIENT_ID');
  console.log('   • app/api/auth/[...nextauth]/route.ts - Uses GOOGLE_CLIENT_ID');

  console.log('\n🎯 Step 4: Test the Fix');
  console.log('======================');
  
  console.log('\n1. Update .env.local with DIFFERENT client IDs');
  console.log('2. Restart your dev server: npm run dev');
  console.log('3. Try signing in: http://localhost:3000/auth/signin');
  console.log('4. Should work without redirect URI errors');

  console.log('\n🚀 Expected Result');
  console.log('=================');
  
  console.log('\n✅ Authentication OAuth:');
  console.log('   • Uses Auth OAuth client');
  console.log('   • Redirects to /api/auth/callback/google');
  console.log('   • Signs user into web app');
  
  console.log('\n✅ Gmail API OAuth (when implemented):');
  console.log('   • Uses Gmail OAuth client');
  console.log('   • Redirects to /api/email/oauth/gmail/callback');
  console.log('   • Grants Gmail access permissions');

  console.log('\n📋 Key Points');
  console.log('=============');
  console.log('• GOOGLE_CLIENT_ID ≠ GMAIL_TEST_CLIENT_ID (must be different!)');
  console.log('• Each OAuth client has different redirect URIs');
  console.log('• Each OAuth client has different purposes');
  console.log('• Code now uses the correct client for each purpose');

  console.log('\n🆘 If Still Having Issues');
  console.log('=========================');
  console.log('1. Check that your TWO OAuth clients have DIFFERENT client IDs');
  console.log('2. Verify redirect URIs are configured correctly in GCP');
  console.log('3. Make sure .env.local has the CORRECT client IDs from EACH OAuth client');
  console.log('4. Restart dev server after updating .env.local');
}

if (require.main === module) {
  fixOAuthConfiguration();
}

export { fixOAuthConfiguration }; 