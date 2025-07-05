import { execSync } from 'child_process';
import { cleanupTestData } from './cleanup-test-data';
import { setupTestHomeowner } from './setup-test-homeowner';
import { OAuthTokenManager } from './email-testing/oauth-manager';

interface TestStep {
  name: string;
  command?: string;
  function?: () => Promise<void>;
  required: boolean;
}

async function runCompleteE2ETest(verbose: boolean = false) {
  console.log('🚀 Starting Complete End-to-End Test');
  console.log('=====================================\n');

  // First, ensure OAuth is ready
  console.log('🔐 Checking OAuth readiness...');
  const oauthManager = new OAuthTokenManager();
  const oauthReady = await oauthManager.ensureReady();
  
  if (!oauthReady) {
    console.log('\n❌ OAuth not ready for E2E testing!');
    console.log('🔧 Run this command to set up OAuth:');
    console.log('   npm run test:oauth:setup-e2e');
    return { success: false, error: 'OAuth not configured' };
  }

  console.log('✅ OAuth ready for E2E testing!\n');

  const steps: TestStep[] = [
    { 
      name: 'Complete Data Cleanup (Gmail + Database)', 
      function: cleanupTestData,
      required: true 
    },
    { 
      name: 'Homeowner Setup', 
      function: setupTestHomeowner,
      required: true 
    },
    { 
      name: 'OAuth Token Refresh (if needed)', 
      command: 'npm run test:oauth:ensure-ready',
      required: true 
    },
    { 
      name: 'Email Generation', 
      command: 'npx tsx scripts/email-testing/realistic-email-generator.ts generate',
      required: true 
    },
    { 
      name: 'Email Ingestion', 
      command: 'npx tsx scripts/email-testing/test-gmail-fetch.ts',
      required: true 
    },
    { 
      name: 'AI Processing', 
      command: 'npx tsx scripts/test-email-analysis-proper.ts',
      required: true 
    },
    { 
      name: 'Flagged Items Creation', 
      command: 'npx tsx scripts/create-flagged-items.ts',
      required: false 
    },
    { 
      name: 'Timeline Integration', 
      command: 'npx tsx scripts/simulate-user-review.ts',
      required: false 
    },
    { 
      name: 'E2E Validation', 
      command: 'npx tsx scripts/validate-e2e-workflow.ts',
      required: true 
    }
  ];

  let completedSteps = 0;
  const startTime = Date.now();
  const results: { step: string; success: boolean; duration: number; error?: string }[] = [];

  try {
    for (const step of steps) {
      console.log(`\n🔄 Step ${completedSteps + 1}/${steps.length}: ${step.name}`);
      console.log('─'.repeat(50));
      
      const stepStartTime = Date.now();
      let success = false;
      let error: string | undefined;

      try {
        if (step.function) {
          await step.function();
        } else if (step.command) {
          execSync(step.command, { 
            stdio: verbose ? 'inherit' : 'pipe',
            encoding: 'utf8'
          });
        }
        success = true;
      } catch (stepError) {
        error = stepError instanceof Error ? stepError.message : String(stepError);
        success = false;
        
        if (step.required) {
          throw new Error(`Required step failed: ${step.name} - ${error}`);
        } else {
          console.log(`⚠️  Optional step failed: ${step.name} - ${error}`);
        }
      }

      const stepDuration = Date.now() - stepStartTime;
      results.push({ step: step.name, success, duration: stepDuration, error });
      
      completedSteps++;
      const status = success ? '✅' : '⚠️';
      console.log(`${status} ${step.name} completed (${stepDuration}ms)`);
    }

    const totalDuration = Date.now() - startTime;
    const successfulSteps = results.filter(r => r.success).length;
    const failedSteps = results.filter(r => !r.success).length;

    console.log('\n🎉 Complete End-to-End Test COMPLETED!');
    console.log('=====================================');
    console.log(`📊 Total Duration: ${(totalDuration / 1000).toFixed(1)} seconds`);
    console.log(`📋 Steps Completed: ${completedSteps}/${steps.length}`);
    console.log(`✅ Successful: ${successfulSteps}`);
    console.log(`⚠️  Failed: ${failedSteps}`);

    // Detailed results
    console.log('\n📊 Detailed Results:');
    for (const result of results) {
      const status = result.success ? '✅' : '❌';
      const duration = `${result.duration}ms`;
      console.log(`   ${status} ${result.step.padEnd(30)} ${duration.padStart(8)}`);
      if (result.error) {
        console.log(`      Error: ${result.error}`);
      }
    }

    // Success criteria
    const requiredSteps = steps.filter(s => s.required).length;
    const successfulRequiredSteps = results.filter(r => r.success && steps.find(s => s.name === r.step)?.required).length;
    
    if (successfulRequiredSteps === requiredSteps) {
      console.log('\n🎉 All required steps passed! E2E test SUCCESSFUL!');
      return { success: true, results };
    } else {
      console.log('\n❌ Some required steps failed. E2E test FAILED!');
      return { success: false, results };
    }

  } catch (error) {
    const totalDuration = Date.now() - startTime;
    console.error(`\n❌ E2E Test FAILED at step ${completedSteps + 1}: ${steps[completedSteps]?.name}`);
    console.error('Error:', error);
    console.log(`📊 Duration before failure: ${(totalDuration / 1000).toFixed(1)} seconds`);
    
    return { success: false, results, error: error instanceof Error ? error.message : String(error) };
  }
}

// CLI handling
async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('--verbose') || args.includes('-v');
  
  console.log('🎯 Nailit End-to-End Testing Playbook');
  console.log('=====================================');
  console.log('Testing complete email workflow: Gmail → Ingestion → AI → Flagged Items → Timeline\n');
  
  if (verbose) {
    console.log('📢 Verbose mode enabled - showing all command output\n');
  }

  const result = await runCompleteE2ETest(verbose);
  
  if (result.success) {
    console.log('\n🎉 E2E Test Suite PASSED!');
    process.exit(0);
  } else {
    console.log('\n❌ E2E Test Suite FAILED!');
    if (result.error === 'OAuth not configured') {
      console.log('\n🔧 To fix OAuth issues:');
      console.log('1. Set up Google OAuth credentials in .env.local');
      console.log('2. Run: npm run test:oauth:setup-e2e');
      console.log('3. Re-run: npm run test:e2e:complete');
    }
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { runCompleteE2ETest }; 