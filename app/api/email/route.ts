import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../lib/prisma'

// Simple classification function - replace with actual AI implementation
async function classifyEmailContent(content: string, title: string) {
  // Mock classification for now
  return {
    category: 'SCOPE' as const,
    confidence: 0.8,
    suggestedImpact: 'Medium' as const
  }
}

export async function POST(request: NextRequest) {
  try {
    const { 
      content,
      subject: title,
      projectId,
      emailDate 
    } = await request.json()

    if (!content || !title || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Classify the email content using AI
    const classification = await classifyEmailContent(content, title)

    // Create flagged item from email content
    const flaggedItem = await prisma.flaggedItem.create({
      data: {
        title,
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