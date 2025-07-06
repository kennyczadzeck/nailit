#!/usr/bin/env tsx

import { config } from 'dotenv';
config({ path: '.env.local' });
import { prisma } from '../app/lib/prisma';

async function verifyOAuthSetup() {
  console.log('🔍 Verifying OAuth setup for test user...\n');

  try {
    // Check user and accounts
    const user = await prisma.user.findUnique({
      where: { email: 'nailit.test.homeowner@gmail.com' },
      include: { 
        accounts: true,
        sessions: true,
        projects: {
          include: {
            teamMembers: true,
            emailSettings: true
          }
        }
      }
    });

    if (!user) {
      console.log('❌ Test user not found');
      return;
    }

    console.log('👤 User Information:');
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.name}`);
    console.log(`   Email Verified: ${user.emailVerified ? '✅' : '❌'}`);
    console.log(`   Created: ${user.createdAt}`);

    console.log('\n🔐 OAuth Accounts:');
    if (user.accounts.length === 0) {
      console.log('   ❌ No OAuth accounts found');
    } else {
      user.accounts.forEach((account, index) => {
        console.log(`   ${index + 1}. Provider: ${account.provider}`);
        console.log(`      Type: ${account.type}`);
        console.log(`      Provider Account ID: ${account.providerAccountId}`);
        console.log(`      Has Access Token: ${account.access_token ? '✅' : '❌'}`);
        console.log(`      Expires At: ${account.expires_at ? new Date(account.expires_at * 1000) : 'N/A'}`);
      });
    }

    console.log('\n📱 Active Sessions:');
    if (user.sessions.length === 0) {
      console.log('   ℹ️  No active sessions (expected for API-only user)');
    } else {
      user.sessions.forEach((session, index) => {
        console.log(`   ${index + 1}. Session Token: ${session.sessionToken.slice(0, 20)}...`);
        console.log(`      Expires: ${session.expires}`);
      });
    }

    console.log('\n🏗️ Projects:');
    if (user.projects.length === 0) {
      console.log('   ❌ No projects found');
    } else {
      user.projects.forEach((project, index) => {
        console.log(`   ${index + 1}. ${project.name}`);
        console.log(`      Status: ${project.status}`);
        console.log(`      Team Members: ${project.teamMembers.length}`);
        console.log(`      Email Settings: ${project.emailSettings ? '✅' : '❌'}`);
        
        if (project.teamMembers.length > 0) {
          project.teamMembers.forEach((member, memberIndex) => {
            console.log(`         ${memberIndex + 1}. ${member.name} (${member.email}) - ${member.role}`);
          });
        }
      });
    }

    console.log('\n✅ OAuth Setup Verification Complete!');
    console.log('\n📋 Summary:');
    console.log(`   • User exists: ✅`);
    console.log(`   • OAuth account linked: ${user.accounts.length > 0 ? '✅' : '❌'}`);
    console.log(`   • Projects: ${user.projects.length}`);
    console.log(`   • Ready for both API and web app auth: ${user.accounts.length > 0 ? '✅' : '❌'}`);

  } catch (error: any) {
    console.error('❌ Error verifying OAuth setup:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  verifyOAuthSetup();
}

export { verifyOAuthSetup }; 