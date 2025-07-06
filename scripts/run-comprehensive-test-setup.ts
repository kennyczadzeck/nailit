#!/usr/bin/env tsx

import { config } from 'dotenv';
import { setupComprehensiveTestData } from '../tests/integration/email-test-setup';

// Load environment variables
config({ path: '.env.local' });

async function main() {
  console.log('🚀 Running Comprehensive Test Setup');
  console.log('===================================\n');
  
  try {
    const result = await setupComprehensiveTestData();
    
    console.log('\n🎉 Setup Complete!');
    console.log('==================');
    console.log('Your test environment is now ready with:');
    console.log(`✅ OAuth-linked user: ${result.user.email}`);
    console.log(`✅ Test project: ${result.project.name}`);
    console.log(`✅ Test emails: ${result.emailsDiscovered}`);
    console.log(`✅ AI analyses: ${result.analyses.length}`);
    console.log(`✅ Flagged items: ${result.uiData.flaggedItems}`);
    console.log(`✅ Timeline entries: ${result.uiData.timelineEntries}`);
    console.log('\nYou can now:');
    console.log('1. Sign in to the app with your Google account');
    console.log('2. View the test project dashboard');
    console.log('3. See flagged items and timeline data');
    console.log('4. Test the AI analysis workflow');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

main(); 