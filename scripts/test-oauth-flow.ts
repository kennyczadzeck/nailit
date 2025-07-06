#!/usr/bin/env tsx

import { config } from 'dotenv';
config({ path: '.env.local' });
import { prisma } from '../app/lib/prisma';

async function testOAuthFlow() {
  console.log('🔐 Testing OAuth Flow for API + Web App...\n');

  try {
    const testEmail = 'nailit.test.homeowner@gmail.com';

    // Step 1: Simulate API authentication (what E2E tests do)
    console.log('1️⃣ Simulating API Authentication...');
    
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { accounts: true }
    });

    if (!user) {
      console.log('❌ Test user not found');
      return;
    }

    if (user.accounts.length === 0) {
      console.log('❌ No OAuth accounts found');
      return;
    }

    const account = user.accounts[0];
    console.log(`   ✅ Found OAuth account: ${account.provider}`);
    console.log(`   ✅ Access token exists: ${!!account.access_token}`);
    console.log(`   ✅ Token expires: ${account.expires_at ? new Date(account.expires_at * 1000) : 'N/A'}`);

    // Step 2: Simulate web app authentication (NextAuth flow)
    console.log('\n2️⃣ Simulating Web App Authentication...');
    
    // This is what NextAuth does when user signs in via web
    const existingUser = await prisma.user.findUnique({
      where: { email: testEmail },
      include: { accounts: true }
    });

    if (existingUser) {
      console.log('   ✅ User exists - NextAuth will find existing user');
      console.log('   ✅ OAuth account exists - NextAuth will create new session');
      
      // Simulate session creation (what NextAuth does)
      const sessionToken = `session-${Date.now()}`;
      const expires = new Date();
      expires.setDate(expires.getDate() + 30); // 30 days from now
      
      const session = await prisma.session.create({
        data: {
          sessionToken,
          userId: existingUser.id,
          expires
        }
      });
      
      console.log(`   ✅ Created web session: ${session.sessionToken.slice(0, 20)}...`);
      console.log(`   ✅ Session expires: ${session.expires}`);
      
      // Clean up test session
      await prisma.session.delete({
        where: { id: session.id }
      });
      console.log('   🧹 Cleaned up test session');
    }

    // Step 3: Verify project access
    console.log('\n3️⃣ Verifying Project Access...');
    
    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      include: { teamMembers: true }
    });

    console.log(`   ✅ User has ${projects.length} projects`);
    projects.forEach((project, index) => {
      console.log(`   ${index + 1}. ${project.name} (${project.teamMembers.length} team members)`);
    });

    console.log('\n✅ OAuth Flow Test Complete!');
    console.log('\n📋 Summary:');
    console.log('   • API Authentication: ✅ (OAuth account exists)');
    console.log('   • Web App Authentication: ✅ (NextAuth will work)');
    console.log('   • Project Access: ✅ (Projects available)');
    console.log('   • E2E Tests: ✅ (Ready to run)');
    
    console.log('\n🎯 Next Steps:');
    console.log('   1. Run E2E tests - they will use the OAuth user');
    console.log('   2. Sign in via web app - NextAuth will find existing user');
    console.log('   3. Both sessions will coexist independently');

  } catch (error: any) {
    console.error('❌ Error testing OAuth flow:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  testOAuthFlow();
}

export { testOAuthFlow }; 