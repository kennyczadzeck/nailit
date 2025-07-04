import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function linkOAuthAccount() {
  console.log('🔗 Linking OAuth account for test user...')

  try {
    // Find the existing user
    const user = await prisma.user.findUnique({
      where: { email: 'nailit.test.homeowner@gmail.com' }
    })

    if (!user) {
      console.error('❌ User not found')
      return
    }

    console.log('✅ Found user:', user.email, '(ID:', user.id + ')')

    // Check if OAuth account already exists
    const existingAccount = await prisma.account.findFirst({
      where: {
        userId: user.id,
        provider: 'google'
      }
    })

    if (existingAccount) {
      console.log('✅ OAuth account already linked:', existingAccount.providerAccountId)
      return existingAccount
    }

    // Create a placeholder OAuth account link
    // Note: This is for testing only - in production, real OAuth tokens are needed
    const account = await prisma.account.create({
      data: {
        userId: user.id,
        type: 'oauth',
        provider: 'google',
        providerAccountId: 'test-provider-account-id', // Placeholder
        refresh_token: 'placeholder-refresh-token',
        access_token: 'placeholder-access-token',
        expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
        token_type: 'Bearer',
        scope: 'openid email profile',
        id_token: 'placeholder-id-token'
      }
    })

    console.log('✅ Created OAuth account link:', account.id)
    console.log('🎉 OAuth account should now be linked!')
    console.log('\n📝 Next steps:')
    console.log('1. Try signing in at: https://u9eack5h4f.us-east-1.awsapprunner.com/auth/signin')
    console.log('2. The OAuth account should now link properly')
    console.log('\n⚠️  Note: This creates placeholder tokens for testing only.')
    console.log('   For production use, complete the real OAuth flow.')

    return account

  } catch (error) {
    console.error('❌ Error linking OAuth account:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Run the script
linkOAuthAccount()
  .catch((error) => {
    console.error('❌ Script failed:', error)
    process.exit(1)
  }) 