import { NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

export async function GET() {
  try {
    // Test basic Prisma operations
    const userCount = await prisma.user.count()
    
    // Test if we can access all the models
    const tests = {
      userCount,
      canAccessProject: typeof prisma.project !== 'undefined',
      canAccessTeamMember: typeof prisma.teamMember !== 'undefined',
      availableModels: Object.keys(prisma).filter(key => 
        !key.startsWith('_') && 
        !key.startsWith('$') && 
        typeof prisma[key as keyof typeof prisma] === 'object'
      )
    }
    
    // Try to create a simple query to test teamMember model
    try {
      const teamMemberCount = await prisma.teamMember.count()
      tests['teamMemberCount'] = teamMemberCount
    } catch (error) {
      tests['teamMemberError'] = error instanceof Error ? error.message : 'Unknown error'
    }
    
    return NextResponse.json({
      message: 'Prisma test successful',
      tests
    })
  } catch (error) {
    console.error('Prisma test error:', error)
    return NextResponse.json(
      { 
        error: 'Prisma test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 