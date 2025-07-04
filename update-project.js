const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateProject() {
  try {
    console.log('Finding project...');
    const project = await prisma.project.findFirst({
      where: { name: { contains: 'Kitchen' } }
    });
    
    if (!project) {
      console.log('No project found');
      return;
    }
    
    console.log('Found project:', project.name);
    console.log('Current contractor:', project.contractor);
    
    console.log('Updating project...');
    const updated = await prisma.project.update({
      where: { id: project.id },
      data: {
        contractor: 'nailit.test.contractor@gmail.com',
        description: 'Complete kitchen renovation project',
        address: '123 Test Street, Test City, TC 12345',
        budget: 75000,
        startDate: new Date('2024-01-15'),
        endDate: new Date('2024-04-15')
      }
    });
    
    console.log('✅ Updated! New contractor:', updated.contractor);
    console.log('✅ Address:', updated.address);
    console.log('✅ Budget:', updated.budget);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateProject(); 