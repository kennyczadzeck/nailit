#!/usr/bin/env tsx

import { config } from 'dotenv';
config({ path: '.env.local' });
import { prisma } from '../app/lib/prisma';

async function showOAuthTypes() {
  console.log('🔐 OAuth Types in Database');
  console.log('==========================\n');

  try {
    const user = await prisma.user.findUnique({
      where: { email: 'nailit.test.homeowner@gmail.com' },
      include: { 
        accounts: true,
        oauthSessions: true
      }
    });

    if (!user) {
      console.log('❌ Test user not found');
      return;
    }

    console.log(`👤 User: ${user.email}\n`);

    console.log('1️⃣ Authentication OAuth (NextAuth)');
    console.log('===================================');
    console.log('Purpose: User signs in to web/mobile app');
    console.log('Table: Account');
    console.log('Scopes: openid email profile');
    console.log('Redirect: /api/auth/callback/google\n');

    if (user.accounts.length > 0) {
      user.accounts.forEach((account, index) => {
        console.log(`   Account ${index + 1}:`);
        console.log(`     Provider: ${account.provider}`);
        console.log(`     Type: ${account.type}`);
        console.log(`     Scope: ${account.scope}`);
        console.log(`     Purpose: ${account.scope?.includes('openid') ? '✅ Authentication' : '❓ Unknown'}`);
        console.log(`     Provider Account ID: ${account.providerAccountId}`);
        console.log(`     Has Access Token: ${account.access_token ? '✅' : '❌'}`);
        console.log('');
      });
    } else {
      console.log('   ❌ No authentication OAuth accounts found\n');
    }

    console.log('2️⃣ Gmail API OAuth (Custom)');
    console.log('============================');
    console.log('Purpose: Access user\'s Gmail for email processing');
    console.log('Table: OAuthSession');
    console.log('Scopes: gmail.readonly');
    console.log('Redirect: /api/email/oauth/gmail/callback\n');

    if (user.oauthSessions.length > 0) {
      user.oauthSessions.forEach((session, index) => {
        console.log(`   OAuth Session ${index + 1}:`);
        console.log(`     Provider: ${session.provider}`);
        console.log(`     Purpose: ${session.sessionPurpose}`);
        console.log(`     Scopes: ${session.scopes.join(', ')}`);
        console.log(`     Active: ${session.isActive ? '✅' : '❌'}`);
        console.log(`     Has Access Token: ${session.accessToken ? '✅' : '❌'}`);
        console.log(`     Expires: ${session.expiresAt || 'N/A'}`);
        console.log('');
      });
    } else {
      console.log('   ❌ No Gmail API OAuth sessions found\n');
    }

    console.log('📋 Summary');
    console.log('==========');
    console.log(`Authentication OAuth: ${user.accounts.length > 0 ? '✅ Ready' : '❌ Missing'}`);
    console.log(`Gmail API OAuth: ${user.oauthSessions.length > 0 ? '✅ Ready' : '❌ Missing'}`);
    console.log('');
    console.log('🎯 What This Means:');
    
    if (user.accounts.length > 0) {
      console.log('✅ User can sign in to web app');
    } else {
      console.log('❌ User cannot sign in to web app (no authentication OAuth)');
    }
    
    if (user.oauthSessions.length > 0) {
      console.log('✅ App can access user\'s Gmail');
    } else {
      console.log('❌ App cannot access user\'s Gmail (no Gmail API OAuth)');
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  showOAuthTypes();
}

export { showOAuthTypes }; 