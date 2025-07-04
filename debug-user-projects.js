const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function debugUserProjects() {
  console.log('🔍 Debugging user authentication and project ownership...\n');
  
  try {
    // Get all users with their OAuth accounts and projects
    const users = await prisma.user.findMany({
      include: {
        accounts: {
          select: {
            id: true,
            type: true,
            provider: true,
            providerAccountId: true,
            // Don't expose sensitive tokens
          }
        },
        projects: {
          include: {
            emailMessages: {
              select: {
                id: true,
                subject: true,
                createdAt: true
              },
              take: 3,
              orderBy: { createdAt: 'desc' }
            },
            emailSettings: {
              select: {
                gmailConnected: true,
                monitoringEnabled: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log(`📊 Found ${users.length} users in database:\n`);

    users.forEach((user, index) => {
      console.log(`${index + 1}. User: ${user.email} (ID: ${user.id})`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Created: ${user.createdAt.toISOString()}`);
      console.log(`   OAuth Accounts: ${user.accounts.length}`);
      
      if (user.accounts.length > 0) {
        user.accounts.forEach(account => {
          console.log(`     - ${account.provider} (${account.type})`);
        });
      }
      
      console.log(`   Projects: ${user.projects.length}`);
      
      if (user.projects.length > 0) {
        user.projects.forEach(project => {
          console.log(`     - "${project.name}" (ID: ${project.id})`);
          console.log(`       Status: ${project.status}`);
          console.log(`       Gmail Connected: ${project.emailSettings?.gmailConnected || false}`);
          console.log(`       Email Messages: ${project.emailMessages.length}`);
          
          if (project.emailMessages.length > 0) {
            console.log(`       Recent emails:`);
            project.emailMessages.forEach(email => {
              console.log(`         * "${email.subject}" (${email.createdAt.toISOString()})`);
            });
          }
        });
      }
      
      console.log('');
    });

    // Check for the specific test user from the logs
    const testUserId = 'cmcno2zmb0000lvnwh6udokku';
    const testUser = await prisma.user.findUnique({
      where: { id: testUserId },
      include: {
        accounts: true,
        projects: {
          include: {
            emailMessages: {
              take: 5,
              orderBy: { createdAt: 'desc' }
            }
          }
        }
      }
    });

    if (testUser) {
      console.log(`🎯 Test user from logs found:`);
      console.log(`   Email: ${testUser.email}`);
      console.log(`   Has OAuth accounts: ${testUser.accounts.length > 0}`);
      console.log(`   Projects: ${testUser.projects.length}`);
      console.log(`   Total emails processed: ${testUser.projects.reduce((sum, p) => sum + p.emailMessages.length, 0)}`);
    } else {
      console.log(`❌ Test user ID ${testUserId} not found in database`);
    }

    // Check for users with the test email
    const testEmailUser = await prisma.user.findFirst({
      where: { 
        email: { contains: 'nailit.test.homeowner' }
      },
      include: {
        accounts: true,
        projects: true
      }
    });

    if (testEmailUser) {
      console.log(`\n📧 Test email user found:`);
      console.log(`   ID: ${testEmailUser.id}`);
      console.log(`   Email: ${testEmailUser.email}`);
      console.log(`   Has OAuth accounts: ${testEmailUser.accounts.length > 0}`);
      console.log(`   Projects: ${testEmailUser.projects.length}`);
    }

  } catch (error) {
    console.error('❌ Error debugging users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the debug function
debugUserProjects().catch(console.error); 