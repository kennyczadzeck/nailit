import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '../../lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    const debugInfo = {
      sessionExists: !!session,
      sessionUser: session?.user ? {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name
      } : null,
      timestamp: new Date().toISOString()
    }

    if (session?.user?.id) {
      // Check if user exists in database
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          projects: {
            include: {
              _count: {
                select: {
                  flaggedItems: { where: { status: 'PENDING' } },
                  timelineEntries: true
                }
              }
            }
          }
        }
      })

      debugInfo.dbUser = dbUser ? {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        projectsCount: dbUser.projects.length,
        projects: dbUser.projects.map(p => ({
          id: p.id,
          name: p.name,
          status: p.status,
          flaggedItems: p._count.flaggedItems,
          timelineEntries: p._count.timelineEntries
        }))
      } : null

      // Also check if there are any projects for this user ID
      const projectCount = await prisma.project.count({
        where: { userId: session.user.id }
      })

      debugInfo.projectCount = projectCount
    }

    return NextResponse.json(debugInfo)
  } catch (error) {
    console.error('Debug error:', error)
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 })
  }
} 