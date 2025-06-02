import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../lib/prisma'

// PATCH /api/flagged-items/[id] - Update flagged item status or category
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json() as { action: string; category?: string; notes?: string };
    const { action, category, notes } = body;
    const resolvedParams = await params
    const itemId = resolvedParams.id

    if (action === 'reclassify' && category) {
      // Update the category and mark as confirmed with high confidence
      const updatedItem = await prisma.flaggedItem.update({
        where: { id: itemId },
        data: {
          category: category.toUpperCase() as 'COST' | 'SCHEDULE' | 'SCOPE',
          aiConfidence: 1.0, // User-corrected classification gets full confidence
          status: 'CONFIRMED'
        }
      })

      // Log the ML feedback
      await prisma.mLFeedback.create({
        data: {
          feedbackType: 'RECLASSIFY',
          userAction: 'reclassified',
          correctCategory: category.toUpperCase() as 'COST' | 'SCHEDULE' | 'SCOPE',
          confidence: 1.0,
          projectId: updatedItem.projectId
        }
      })

      // Create timeline entry for confirmed item
      if (category && updatedItem.impact) {
        await prisma.timelineEntry.create({
          data: {
            title: `Confirmed: ${updatedItem.title}`,
            description: updatedItem.description,
            category: category.toUpperCase() as 'COST' | 'SCHEDULE' | 'SCOPE',
            date: new Date(),
            impact: updatedItem.impact,
            projectId: updatedItem.projectId,
            flaggedItemId: itemId,
            verified: true
          }
        })
      }

      return NextResponse.json(updatedItem)
    }

    // Handle other actions (confirm, ignore, email_sent)
    const statusMap: Record<string, 'PENDING' | 'CONFIRMED' | 'IGNORED' | 'EMAIL_SENT'> = {
      confirm: 'CONFIRMED',
      ignore: 'IGNORED',
      email_sent: 'EMAIL_SENT'
    }

    if (!action || !statusMap[action]) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    let updateData: any = {}
    let timelineEntry = null

    switch (action) {
      case 'confirm':
        updateData = {
          status: 'CONFIRMED',
          reviewedAt: new Date(),
          userNotes: notes || null
        }

        // Get the flagged item to create timeline entry
        const flaggedItem = await prisma.flaggedItem.findUnique({
          where: { id: itemId },
          include: { project: true }
        })

        if (flaggedItem) {
          // Create corresponding timeline entry
          timelineEntry = await prisma.timelineEntry.create({
            data: {
              title: flaggedItem.title,
              description: flaggedItem.description,
              category: flaggedItem.category as 'COST' | 'SCHEDULE' | 'SCOPE' | 'ISSUE' | 'UPDATE',
              date: flaggedItem.emailDate,
              impact: flaggedItem.impact,
              projectId: flaggedItem.projectId,
              flaggedItemId: itemId,
              verified: true,
            }
          })
        }
        break

      case 'ignore':
        updateData = {
          status: 'IGNORED',
          reviewedAt: new Date(),
          userNotes: notes || null
        }
        break

      case 'email_sent':
        updateData = {
          status: 'EMAIL_SENT',
          reviewedAt: new Date(),
          userNotes: notes || null
        }
        break

      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        )
    }

    // Update the flagged item
    const updatedItem = await prisma.flaggedItem.update({
      where: { id: itemId },
      data: updateData
    })

    // Log ML feedback
    const feedbackType = action === 'confirm' ? 'POSITIVE' : action === 'ignore' ? 'NEGATIVE' : 'PENDING';
    await prisma.mLFeedback.create({
      data: {
        feedbackType: feedbackType as 'POSITIVE' | 'NEGATIVE' | 'RECLASSIFY',
        userAction: action,
        flaggedItemId: itemId,
        projectId: updatedItem.projectId
      }
    });

    return NextResponse.json({
      success: true,
      item: updatedItem,
      timelineEntry
    })
  } catch (error) {
    console.error('Error updating flagged item:', error)
    return NextResponse.json(
      { error: 'Failed to update flagged item' },
      { status: 500 }
    )
  }
} 