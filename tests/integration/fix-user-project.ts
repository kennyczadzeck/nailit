import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixUserProject() {
  console.log('🔧 Fixing user/project mismatch...');
  
  // Get all users
  const users = await prisma.user.findMany({
    include: {
      accounts: true,
      projects: true
    },
    orderBy: { createdAt: 'desc' }
  });
  
  console.log(`Found ${users.length} users:`);
  users.forEach((user, index) => {
    console.log(`${index + 1}. ${user.email} (ID: ${user.id}) - ${user.projects.length} projects`);
  });
  
  // Find the user with OAuth account (most recent should be the real one)
  const oauthUser = users.find(user => user.accounts.length > 0);
  
  if (!oauthUser) {
    console.log('❌ No OAuth user found');
    return;
  }
  
  console.log(`\n✅ OAuth user: ${oauthUser.email} (ID: ${oauthUser.id})`);
  
  // Find any test projects not owned by the OAuth user
  const orphanedProjects = await prisma.project.findMany({
    where: {
      NOT: { userId: oauthUser.id },
      name: { contains: 'Test' }
    },
    include: {
      emailMessages: true
    }
  });
  
  if (orphanedProjects.length === 0) {
    console.log('✅ No orphaned test projects found');
    return;
  }
  
  console.log(`\n🔄 Transferring ${orphanedProjects.length} test projects to OAuth user...`);
  
  for (const project of orphanedProjects) {
    console.log(`- Transferring "${project.name}" with ${project.emailMessages.length} emails`);
    
    await prisma.project.update({
      where: { id: project.id },
      data: { userId: oauthUser.id }
    });
  }
  
  console.log('\n✅ Project transfer complete!');
  
  // Verify the OAuth user now has projects
  const updatedUser = await prisma.user.findUnique({
    where: { id: oauthUser.id },
    include: {
      projects: {
        include: {
          emailMessages: true
        }
      }
    }
  });
  
  console.log(`\n📊 OAuth user now has ${updatedUser?.projects.length} projects:`);
  updatedUser?.projects.forEach(project => {
    console.log(`- ${project.name} (${project.emailMessages.length} emails)`);
  });
  
  await prisma.$disconnect();
}

if (require.main === module) {
  fixUserProject().catch(console.error);
}

export { fixUserProject }; 