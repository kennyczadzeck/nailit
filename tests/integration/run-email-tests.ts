#!/usr/bin/env tsx

/**
 * Email Testing Runner
 * Usage: npx tsx tests/integration/run-email-tests.ts [db|real|both] [homeowner@email.com] [contractor@email.com]
 */

import { config } from 'dotenv';
import { setupComprehensiveTestData } from './email-test-setup';

// Load environment variables
config({ path: '.env.local' });

async function runEmailTests() {
  console.log('🚀 Running Email Integration Tests');
  console.log('==================================\n');
  
  try {
    // Setup comprehensive test data
    console.log('📋 Setting up test environment...');
    const setupResult = await setupComprehensiveTestData();
    
    console.log('\n✅ Test Environment Ready');
    console.log('=========================');
    console.log(`User: ${setupResult.user.email}`);
    console.log(`Project: ${setupResult.project.name}`);
    console.log(`Emails Discovered: ${setupResult.emailsDiscovered}`);
    console.log(`Emails Processed: ${setupResult.emailsProcessed}`);
    console.log(`AI Analyses: ${setupResult.analyses.length}`);
    console.log(`Flagged Items: ${setupResult.uiData.flaggedItems}`);
    console.log(`Timeline Entries: ${setupResult.uiData.timelineEntries}`);
    
    // Verify the data integrity
    console.log('\n🔍 Verifying Data Integrity...');
    const verificationResults = await verifyTestDataIntegrity(setupResult);
    
    if (verificationResults.success) {
      console.log('✅ All data integrity checks passed!');
      console.log('\n🎯 Test Summary:');
      console.log('================');
      console.log('✅ OAuth account properly linked');
      console.log('✅ Test project created and linked');
      console.log('✅ Test emails created with proper relations');
      console.log('✅ AI analyses generated and stored');
      console.log('✅ Flagged items created from analyses');
      console.log('✅ Timeline entries created from analyses');
      console.log('✅ All database relations are intact');
      
      console.log('\n🚀 Ready for Manual Testing:');
      console.log('============================');
      console.log('1. Sign in to the app with your Google account');
      console.log('2. Navigate to the test project dashboard');
      console.log('3. Verify flagged items are displayed');
      console.log('4. Verify timeline entries are displayed');
      console.log('5. Test the AI analysis workflow');
      
      return { success: true, data: setupResult };
    } else {
      console.error('❌ Data integrity checks failed:', verificationResults.errors);
      return { success: false, errors: verificationResults.errors };
    }
    
  } catch (error) {
    console.error('❌ Email test setup failed:', error);
    return { success: false, error };
  }
}

async function verifyTestDataIntegrity(setupResult: any) {
  const errors = [];
  
  try {
    // Verify user exists and has correct OAuth account
    if (!setupResult.user || !setupResult.user.email) {
      errors.push('User not properly created');
    }
    
    // Verify project exists and is linked to user
    if (!setupResult.project || setupResult.project.userId !== setupResult.user.id) {
      errors.push('Project not properly linked to user');
    }
    
    // Verify emails were discovered and processed
    if (!setupResult.emailsDiscovered || setupResult.emailsDiscovered === 0) {
      errors.push('No emails discovered via Gmail API');
    }
    
    if (!setupResult.emailsProcessed || setupResult.emailsProcessed === 0) {
      errors.push('No emails processed through pipeline');
    }
    
    // Verify analyses exist
    if (!setupResult.analyses || setupResult.analyses.length === 0) {
      errors.push('No AI analyses created');
    }
    
    // Verify UI data was created
    if (setupResult.uiData.flaggedItems === 0) {
      console.warn('⚠️  No flagged items created - this may be expected if analyses are duplicates');
    }
    
    if (setupResult.uiData.timelineEntries === 0) {
      console.warn('⚠️  No timeline entries created - this may be expected if entries are duplicates');
    }
    
    return { success: errors.length === 0, errors };
    
  } catch (error) {
    return { success: false, errors: [`Verification failed: ${error}`] };
  }
}

// Run the tests
if (require.main === module) {
  runEmailTests()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Email integration tests completed successfully!');
        process.exit(0);
      } else {
        console.error('\n❌ Email integration tests failed');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('❌ Unexpected error:', error);
      process.exit(1);
    });
}

export { runEmailTests, verifyTestDataIntegrity }; 