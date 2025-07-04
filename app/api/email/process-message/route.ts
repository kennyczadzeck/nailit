import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../../../lib/logger'
import { prisma } from '../../../lib/prisma'

// Manual email processing endpoint (for testing and background jobs)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { messageId, userId, projectId, testMode = false } = body

    if (!messageId || !userId || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: messageId, userId, projectId' },
        { status: 400 }
      )
    }

    logger.info('Manual email processing requested', {
      messageId,
      userId,
      projectId,
      testMode
    })

    // Get user and project with email settings
    const project = await prisma.project.findUnique({
      where: {
        id: projectId,
        userId: userId
      },
      include: {
        emailSettings: true,
        user: true
      }
    })

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found or access denied' },
        { status: 404 }
      )
    }

    if (!project.emailSettings?.gmailConnected || !project.emailSettings?.gmailRefreshToken) {
      return NextResponse.json(
        { error: 'Gmail not connected for this project' },
        { status: 400 }
      )
    }

    // For now, return success - the actual processing logic will be implemented later
    // This prevents the import error while maintaining the API structure
    logger.info('Manual email processing completed (placeholder)', {
      messageId,
      userId,
      projectId,
      testMode
    })

    return NextResponse.json({
      success: true,
      message: 'Email processing endpoint available (implementation pending)',
      messageId,
      projectId
    })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Manual email processing failed', {
      error: errorMessage,
      stack: errorStack
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check processing status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const messageId = searchParams.get('messageId')
    const projectId = searchParams.get('projectId')

    if (!messageId) {
      return NextResponse.json(
        { error: 'messageId parameter required' },
        { status: 400 }
      )
    }

    // Find the email message
    const emailMessage = await prisma.emailMessage.findUnique({
      where: { messageId },
      include: {
        project: {
          select: {
            id: true,
            name: true
          }
        },
        user: {
          select: {
            id: true,
            email: true
          }
        }
      }
    })

    if (!emailMessage) {
      return NextResponse.json(
        { error: 'Email message not found' },
        { status: 404 }
      )
    }

    // Check project access if specified
    if (projectId && emailMessage.projectId !== projectId) {
      return NextResponse.json(
        { error: 'Email message not found in specified project' },
        { status: 404 }
      )
    }

    const status = {
      messageId: emailMessage.messageId,
      subject: emailMessage.subject,
      sender: emailMessage.sender,
      sentAt: emailMessage.sentAt,
      ingestionStatus: emailMessage.ingestionStatus,
      analysisStatus: emailMessage.analysisStatus,
      assignmentStatus: emailMessage.assignmentStatus,
      hasS3Content: !!emailMessage.s3ContentPath,
      attachmentCount: emailMessage.s3AttachmentPaths.length,
      project: emailMessage.project,
      user: emailMessage.user,
      providerData: emailMessage.providerData,
      createdAt: emailMessage.createdAt,
      updatedAt: emailMessage.updatedAt
    }

    return NextResponse.json({ status })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    logger.error('Failed to get email processing status', {
      error: errorMessage
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 