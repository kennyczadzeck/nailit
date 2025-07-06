#!/usr/bin/env tsx

import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function fixAccountLinking() {
  console.log('🔧 Fixing OAuth Account Linking');
  console.log('================================\n');
  
  try {
    // Find the test user
    const user = await prisma.user.findUnique({
      where: { email: 'nailit.test.homeowner@gmail.com' },
      include: { 
        accounts: true,
        projects: {
          include: {
            emailMessages: {
              include: {
                emailAnalyses: true
              }
            }
          }
        }
      }
    });
    
    if (!user) {
      console.log('❌ Test user not found');
      return;
    }
    
    console.log('✅ Test user found:', user.email);
    console.log('📋 Current accounts:', user.accounts.length);
    
    // Find the Google account
    const googleAccount = user.accounts.find(acc => acc.provider === 'google');
    
    if (googleAccount) {
      console.log('\n🔄 Updating Google account...');
      console.log('  Current providerAccountId:', googleAccount.providerAccountId);
      console.log('  New providerAccountId: 101909860186394105994');
      
      // Update the providerAccountId to match the new OAuth client
      await prisma.account.update({
        where: { id: googleAccount.id },
        data: {
          providerAccountId: '101909860186394105994'
        }
      });
      
      console.log('✅ Google account updated successfully');
    } else {
      console.log('\n➕ Creating new Google account...');
      
      // Create new Google account record
      await prisma.account.create({
        data: {
          userId: user.id,
          type: 'oauth',
          provider: 'google',
          providerAccountId: '101909860186394105994',
          // These will be populated on next login
          access_token: '',
          token_type: 'Bearer',
          scope: 'openid email profile'
        }
      });
      
      console.log('✅ New Google account created');
    }
    
    console.log('\n📊 User Data Summary:');
    console.log(`  Projects: ${user.projects.length}`);
    user.projects.forEach(project => {
      console.log(`    - ${project.name} (${project.emailMessages.length} emails)`);
      project.emailMessages.forEach(email => {
        console.log(`      • ${email.subject} (${email.emailAnalyses.length} analyses)`);
      });
    });
    
  } catch (error) {
    console.error('❌ Error fixing account linking:', error);
  } finally {
    await prisma.$disconnect();
  }
}

if (require.main === module) {
  fixAccountLinking();
}

export { fixAccountLinking }; 