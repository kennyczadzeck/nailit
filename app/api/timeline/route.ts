import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

// GET /api/timeline - Get all timeline entries for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    const timelineEntries = await prisma.timelineEntry.findMany({
      where: {
        projectId
      },
      include: {
        flaggedItem: {
          select: {
            emailFrom: true,
            originalEmail: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Transform data for frontend
    const transformedEntries = timelineEntries.map(entry => ({
      id: entry.id,
      title: entry.title,
      description: entry.description,
      category: entry.category.toLowerCase(),
      date: entry.date.toISOString().split('T')[0],
      time: formatRelativeTime(entry.date),
      impact: entry.impact || '',
      cost: entry.cost,
      scheduleImpact: entry.scheduleImpact,
      scopeDetails: entry.scopeDetails,
      verified: entry.verified,
      fromFlaggedItem: !!entry.flaggedItemId,
      emailFrom: entry.flaggedItem?.emailFrom || null,
      createdAt: entry.createdAt.toISOString()
    }))

    return NextResponse.json(transformedEntries)
  } catch (error) {
    console.error('Error fetching timeline entries:', error)
    return NextResponse.json(
      { error: 'Failed to fetch timeline entries' },
      { status: 500 }
    )
  }
}

// Helper function for relative time formatting
function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    return 'Today'
  } else if (diffDays === 1) {
    return 'Yesterday'
  } else if (diffDays < 7) {
    return `${diffDays} days ago`
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  } else {
    const months = Math.floor(diffDays / 30)
    return `${months} month${months === 1 ? '' : 's'} ago`
  }
} 