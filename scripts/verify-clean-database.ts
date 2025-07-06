import { prisma } from '../app/lib/prisma';

async function verifyCleanDatabase() {
  console.log('🔍 Verifying database is clean...');
  
  try {
    // Check all test-related tables
    const checks = [
      { name: 'EmailAnalysis', count: await prisma.emailAnalysis.count() },
      { name: 'TimelineEntry', count: await prisma.timelineEntry.count() },
      { name: 'FlaggedItem', count: await prisma.flaggedItem.count() },
      { name: 'EmailMessage', count: await prisma.emailMessage.count() },
      { name: 'TeamMember', count: await prisma.teamMember.count() },
      { name: 'EmailSettings', count: await prisma.emailSettings.count() },
      { name: 'Project', count: await prisma.project.count() },
      { 
        name: 'Test Users', 
        count: await prisma.user.count({
          where: { email: { contains: 'nailit.test' } }
        })
      }
    ];

    console.log('\n📊 Database Status:');
    let totalRecords = 0;
    let hasData = false;

    for (const check of checks) {
      const status = check.count === 0 ? '✅' : '❌';
      console.log(`   ${status} ${check.name}: ${check.count} records`);
      totalRecords += check.count;
      if (check.count > 0) hasData = true;
    }

    console.log(`\n📈 Total Records: ${totalRecords}`);

    if (!hasData) {
      console.log('🎉 Database is clean! Ready for E2E testing.');
      return { clean: true, totalRecords };
    } else {
      console.log('⚠️  Database contains test data. Run cleanup first.');
      return { clean: false, totalRecords };
    }

  } catch (error) {
    console.error('❌ Database verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification if called directly
if (require.main === module) {
  verifyCleanDatabase()
    .then((result) => {
      process.exit(result.clean ? 0 : 1);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { verifyCleanDatabase }; 