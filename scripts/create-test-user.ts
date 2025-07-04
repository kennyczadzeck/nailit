import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function createTestUser() {
  console.log('🔧 Creating test user for OAuth linking...')

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: 'nailit.test.homeowner@gmail.com' }
    })

    if (existingUser) {
      console.log('✅ User already exists:', existingUser.email)
      console.log('🆔 User ID:', existingUser.id)
      return existingUser
    }

    // Create the test user
    const user = await prisma.user.create({
      data: {
        email: 'nailit.test.homeowner@gmail.com',
        name: 'NailIt Test Homeowner',
        emailVerified: new Date(), // Mark as verified for testing
      },
    })

    console.log('✅ Created test user:', user.email)
    console.log('🆔 User ID:', user.id)

    // Create a test project for this user
    const project = await prisma.project.create({
      data: {
        name: 'Test Kitchen Renovation',
        description: 'Test project for email ingestion development',
        status: 'ACTIVE',
        startDate: new Date('2025-01-01'),
        contractor: 'Test Contractor LLC',
        budget: 50000,
        address: '123 Test St, Test City, CA 90210',
        userId: user.id,
      },
    })

    console.log('🏠 Created test project:', project.name)
    console.log('🆔 Project ID:', project.id)

    // Create email settings for the project
    await prisma.emailSettings.create({
      data: {
        projectId: project.id,
        gmailConnected: true,
        monitoringEnabled: true,
        notificationsEnabled: true,
        weeklyReports: true,
        highPriorityAlerts: true,
      },
    })

    console.log('📧 Created email settings for project')

    console.log('\n🎉 Setup complete! The user can now sign in with OAuth.')
    console.log('\n📝 Next steps:')
    console.log('1. Try signing in at: https://u9eack5h4f.us-east-1.awsapprunner.com/auth/signin')
    console.log('2. Use the nailit.test.homeowner@gmail.com account')
    console.log('3. The OAuth account should now link properly')

    return { user, project }

  } catch (error) {
    console.error('❌ Error creating test user:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
createTestUser()
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }) 