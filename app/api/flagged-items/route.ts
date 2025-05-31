import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

// GET /api/flagged-items - Get all flagged items for a project
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

    const flaggedItems = await prisma.flaggedItem.findMany({
      where: {
        projectId,
        status: 'PENDING' // Only show pending items
      },
      orderBy: {
        emailDate: 'desc'
      }
    })

    // Transform the data to match frontend expectations
    const transformedItems = flaggedItems.map(item => ({
      id: item.id,
      category: item.category.toLowerCase(),
      title: item.title,
      description: item.description,
      impact: item.impact,
      date: item.emailDate.toISOString().split('T')[0],
      time: getRelativeTime(item.emailDate),
      emailFrom: item.emailFrom,
      project: 'Kitchen Renovation', // TODO: Get from project relation
      needsEmailResponse: item.needsEmailResponse,
      aiConfidence: item.aiConfidence,
      originalEmail: item.originalEmail,
      detectedChanges: item.detectedChanges as string[] || []
    }))

    return NextResponse.json(transformedItems)
  } catch (error) {
    console.error('Error fetching flagged items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch flagged items' },
      { status: 500 }
    )
  }
}

// Helper function to get relative time
function getRelativeTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffDays = Math.floor(diffHours / 24)

  if (diffHours < 1) {
    return 'Just now'
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  } else if (diffDays === 1) {
    return '1 day ago'
  } else {
    return `${diffDays} days ago`
  }
} 