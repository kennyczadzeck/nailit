import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]/route'
import { prisma } from '../../lib/prisma'

/**
 * @swagger
 * /api/flagged-items:
 *   get:
 *     summary: Get flagged items for a project
 *     description: Returns a list of flagged items for the specified project
 *     tags:
 *       - Flagged Items
 *     parameters:
 *       - in: query
 *         name: projectId
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the project to get flagged items for
 *     responses:
 *       200:
 *         description: Successfully retrieved flagged items
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   title:
 *                     type: string
 *                   description:
 *                     type: string
 *                   category:
 *                     type: string
 *                     enum: [COST, SCHEDULE, SCOPE, ISSUE, UPDATE]
 *                   status:
 *                     type: string
 *                     enum: [PENDING, RESOLVED, DISMISSED]
 *                   priority:
 *                     type: string
 *                     enum: [LOW, MEDIUM, HIGH]
 *       400:
 *         description: Bad request - missing projectId
 *       401:
 *         description: Unauthorized
 */
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