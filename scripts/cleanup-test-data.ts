import { prisma } from '../app/lib/prisma';
import { execSync } from 'child_process';

async function cleanupTestData() {
  console.log('🧹 Cleaning up test data...');
  
  try {
    // First, clean Gmail accounts to remove any existing test emails
    console.log('\n📧 Cleaning Gmail accounts...');
    await cleanupGmailAccounts();
    
    // Then clean database in dependency order to avoid foreign key constraints
    console.log('\n🗄️ Cleaning database...');
    await cleanupDatabase();
    
    console.log('\n🎉 Complete test data cleanup finished!');
    
  } catch (error) {
    console.error('❌ Test data cleanup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function cleanupGmailAccounts() {
  try {
    console.log('   Cleaning homeowner Gmail account...');
    execSync('npx tsx scripts/email-testing/gmail-inbox-cleaner.ts cleanup homeowner', { 
      stdio: 'inherit' 
    });
    console.log('   ✅ Homeowner Gmail cleaned');

    console.log('   Cleaning contractor Gmail account...');
    execSync('npx tsx scripts/email-testing/gmail-inbox-cleaner.ts cleanup contractor', { 
      stdio: 'inherit' 
    });
    console.log('   ✅ Contractor Gmail cleaned');

    // Wait a moment for Gmail API to process the changes
    console.log('   ⏳ Waiting for Gmail API to process changes...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
  } catch (error) {
    console.warn('⚠️  Gmail cleanup failed (continuing with database cleanup):', error);
    // Don't throw - we can continue with database cleanup even if Gmail cleanup fails
  }
}

async function cleanupDatabase() {
  try {
    // Delete in dependency order to avoid foreign key constraints
    console.log('   Deleting EmailAnalysis records...');
    const deletedAnalyses = await prisma.emailAnalysis.deleteMany({});
    console.log(`   ✅ Deleted ${deletedAnalyses.count} EmailAnalysis records`);

    console.log('   Deleting TimelineEntry records...');
    const deletedTimeline = await prisma.timelineEntry.deleteMany({});
    console.log(`   ✅ Deleted ${deletedTimeline.count} TimelineEntry records`);

    console.log('   Deleting FlaggedItem records...');
    const deletedFlagged = await prisma.flaggedItem.deleteMany({});
    console.log(`   ✅ Deleted ${deletedFlagged.count} FlaggedItem records`);

    console.log('   Deleting EmailMessage records...');
    const deletedEmails = await prisma.emailMessage.deleteMany({});
    console.log(`   ✅ Deleted ${deletedEmails.count} EmailMessage records`);

    console.log('   Deleting TeamMember records...');
    const deletedTeamMembers = await prisma.teamMember.deleteMany({});
    console.log(`   ✅ Deleted ${deletedTeamMembers.count} TeamMember records`);

    console.log('   Deleting EmailSettings records...');
    const deletedEmailSettings = await prisma.emailSettings.deleteMany({});
    console.log(`   ✅ Deleted ${deletedEmailSettings.count} EmailSettings records`);

    console.log('   Deleting Project records...');
    const deletedProjects = await prisma.project.deleteMany({});
    console.log(`   ✅ Deleted ${deletedProjects.count} Project records`);

    console.log('   Deleting test User records...');
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        email: {
          contains: 'nailit.test'
        }
      }
    });
    console.log(`   ✅ Deleted ${deletedUsers.count} test User records`);
    
    console.log('\n📊 Database Cleanup Summary:');
    console.log(`   Users: ${deletedUsers.count}`);
    console.log(`   Projects: ${deletedProjects.count}`);
    console.log(`   Team Members: ${deletedTeamMembers.count}`);
    console.log(`   Email Messages: ${deletedEmails.count}`);
    console.log(`   AI Analyses: ${deletedAnalyses.count}`);
    console.log(`   Flagged Items: ${deletedFlagged.count}`);
    console.log(`   Timeline Entries: ${deletedTimeline.count}`);
    
  } catch (error) {
    console.error('❌ Database cleanup failed:', error);
    throw error;
  }
}

// Run cleanup if called directly
if (require.main === module) {
  cleanupTestData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { cleanupTestData }; 