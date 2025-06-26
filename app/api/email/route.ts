import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

// Simple classification function - replace with actual AI implementation
async function classifyEmailContent() {
  // Mock classification for now
  return {
    category: 'SCOPE' as const,
    confidence: 0.8,
    suggestedImpact: 'Medium' as const
  }
}

/**
 * @swagger
 * /api/email:
 *   post:
 *     summary: Process incoming email
 *     description: Process and classify incoming email content to create flagged items
 *     tags:
 *       - Email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - content
 *               - subject
 *               - projectId
 *             properties:
 *               content:
 *                 type: string
 *                 description: Email body content
 *               subject:
 *                 type: string
 *                 description: Email subject line
 *               projectId:
 *                 type: string
 *                 description: Project ID to associate the flagged item with
 *               emailDate:
 *                 type: string
 *                 format: date-time
 *                 description: Email timestamp (optional, defaults to current time)
 *     responses:
 *       200:
 *         description: Email processed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 flaggedItem:
 *                   type: object
 *                   description: Created flagged item
 *                 classification:
 *                   type: object
 *                   properties:
 *                     category:
 *                       type: string
 *                       enum: [COST, SCHEDULE, SCOPE, ISSUE, UPDATE]
 *                     confidence:
 *                       type: number
 *                     suggestedImpact:
 *                       type: string
 *                       enum: [LOW, MEDIUM, HIGH]
 *       400:
 *         description: Bad request - missing required fields
 *       500:
 *         description: Email processing error
 */
export async function POST(request: NextRequest) {
  try {
    const { 
      content,
      subject,
      projectId,
      emailDate 
    } = await request.json()

    if (!content || !subject || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Classify the email content using AI
    const classification = await classifyEmailContent()

    // Create flagged item from email content
    const flaggedItem = await prisma.flaggedItem.create({
      data: {
        title: subject,
        description: content,
        category: classification.category,
        impact: classification.suggestedImpact,
        aiConfidence: classification.confidence,
        emailDate: new Date(emailDate || Date.now()),
        emailFrom: 'user@example.com', // Will be provided by actual email integration
        status: 'PENDING',
        project: {
          connect: { id: projectId }
        }
      }
    })

    // Create ML feedback entry to track AI classification
    await prisma.mLFeedback.create({
      data: {
        feedbackType: 'CLASSIFY',
        userAction: 'auto_classify',
        correctCategory: classification.category,
        confidence: classification.confidence,
        flaggedItemId: flaggedItem.id,
        projectId
      }
    })

    return NextResponse.json({
      success: true,
      flaggedItem,
      classification
    })

  } catch (error) {
    console.error('Error processing email:', error)
    return NextResponse.json(
      { error: 'Failed to process email' },
      { status: 500 }
    )
  }
} 