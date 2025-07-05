import { prisma } from '../app/lib/prisma';

async function setupTestHomeowner() {
  console.log('👤 Setting up test homeowner account...');
  
  try {
    // 1. Create test homeowner user
    const user = await prisma.user.create({
      data: {
        email: 'nailit.test.homeowner@gmail.com',
        name: 'Test Homeowner',
        emailVerified: new Date()
      }
    });
    console.log(`✅ Created user: ${user.email}`);

    // 2. Create test project
    const project = await prisma.project.create({
      data: {
        name: 'Kitchen Renovation Test Project',
        description: 'End-to-end testing project for email ingestion workflow',
        status: 'ACTIVE',
        startDate: new Date('2024-12-01'),
        endDate: new Date('2025-02-28'),
        budget: 75000,
        address: '123 Test Street, Test City, CA 90210',
        userId: user.id
      }
    });
    console.log(`✅ Created project: ${project.name}`);

    // 3. Create email settings (monitoring enabled)
    const emailSettings = await prisma.emailSettings.create({
      data: {
        projectId: project.id,
        monitoringEnabled: true,
        gmailConnected: true,
        notificationsEnabled: true
      }
    });
    console.log(`✅ Created email settings (monitoring enabled)`);

    // 4. Add team members for filtering (only accounts we can actually test with)
    const teamMembers = [
      {
        name: 'Mike Johnson',
        email: 'nailit.test.contractor@gmail.com',
        role: 'GENERAL_CONTRACTOR' as const
      }
    ];

    const createdTeamMembers = [];
    for (const member of teamMembers) {
      const teamMember = await prisma.teamMember.create({
        data: {
          ...member,
          projectId: project.id
        }
      });
      createdTeamMembers.push(teamMember);
      console.log(`✅ Added team member: ${teamMember.name} (${teamMember.email})`);
    }

    console.log('\n🎉 Test homeowner setup complete!');
    console.log(`📋 Summary:`);
    console.log(`   User: ${user.email}`);
    console.log(`   Project: ${project.name}`);
    console.log(`   Team Members: ${createdTeamMembers.length}`);
    console.log(`   Email Monitoring: Enabled`);
    
    return { user, project, emailSettings, teamMembers: createdTeamMembers };
    
  } catch (error) {
    console.error('❌ Test homeowner setup failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run setup if called directly
if (require.main === module) {
  setupTestHomeowner()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

export { setupTestHomeowner }; 