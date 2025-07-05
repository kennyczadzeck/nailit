import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '../../lib/prisma'
import { withDebugSecurity, debugSecurityHeaders } from '../../lib/security-middleware'

async function handleTestProject() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Testing minimal project creation with session user:', session.user.id);

    // Try creating a minimal project with hardcoded data
    const testProject = await prisma.project.create({
      data: {
        name: "Test Project",
        description: "Simple test",
        address: "123 Test St",
        budget: 1000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        userId: session.user.id
      }
    });

    console.log('Test project created successfully:', testProject);

    return NextResponse.json({
      success: true,
      project: testProject
    }, {
      headers: debugSecurityHeaders
    })
  } catch (error: unknown) {
    console.error('Test project creation failed:', error);
    return NextResponse.json(
      { 
        error: 'Test project creation failed', 
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500, headers: debugSecurityHeaders }
    )
  }
}

export const GET = withDebugSecurity(handleTestProject)

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Testing minimal project creation with session user:', session.user.id);

    // Try creating a minimal project with hardcoded data
    const testProject = await prisma.project.create({
      data: {
        name: "Test Project",
        description: "Simple test",
        address: "123 Test St",
        budget: 1000,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        userId: session.user.id
      }
    });

    console.log('Test project created successfully:', testProject);

    return NextResponse.json({
      success: true,
      project: testProject
    })
  } catch (error) {
    console.error('Test project creation failed:', error);
    return NextResponse.json(
      { 
        error: 'Test project creation failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
} 