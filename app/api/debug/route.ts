import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '../../lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Test basic connectivity
    const userCount = await prisma.user.count()
    
    // Test if TeamMember model exists
    const teamMemberCount = await prisma.teamMember.count()
    
    return NextResponse.json({
      message: 'Debug info',
      session: session.user,
      userCount,
      teamMemberCount,
      prismaModels: Object.keys(prisma)
    })
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json(
      { error: 'Debug failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
} 