import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { logger } from '../../../../lib/logger'
import { prisma } from '../../../../lib/prisma'

type EmailSettings = {
  gmailConnected: boolean;
  monitoringEnabled: boolean;
  gmailTokenExpiry: Date | null;
  gmailRefreshToken: string | null;
  notificationsEnabled: boolean;
  weeklyReports: boolean;
  highPriorityAlerts: boolean;
} | null;

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Verify user owns the project and get basic info
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id
      },
      select: {
        id: true,
        name: true,
        emailSettings: {
          select: {
            gmailConnected: true,
            monitoringEnabled: true,
            gmailTokenExpiry: true,
            gmailRefreshToken: true,
            notificationsEnabled: true,
            weeklyReports: true,
            highPriorityAlerts: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Build homeowner-friendly status (simplified for now without EmailMessage stats)
    const connectionStatus = {
      projectId,
      projectName: project.name,
      
      // Core email monitoring health
      emailMonitoring: {
        isConnected: project.emailSettings?.gmailConnected || false,
        isActivelyMonitoring: project.emailSettings?.monitoringEnabled || false,
        status: getMonitoringStatus(project.emailSettings),
        statusMessage: getStatusMessage(project.emailSettings)
      },
      
      // Recent activity placeholder - will be populated once EmailMessage table is ready
      recentActivity: {
        totalEmailsProcessed: 0, // Will be updated once Prisma recognizes EmailMessage
        recentEmails: [], // Will be populated with actual email data
        lastActivityAt: null,
        note: "Email processing infrastructure ready - waiting for first emails"
      },
      
      // Notification preferences
      notifications: {
        emailNotifications: project.emailSettings?.notificationsEnabled || false,
        weeklyReports: project.emailSettings?.weeklyReports || false,
        urgentAlerts: project.emailSettings?.highPriorityAlerts || false
      }
    }

    logger.info('Email connection status retrieved for homeowner', {
      userId: session.user.id,
      projectId,
      isConnected: connectionStatus.emailMonitoring.isConnected,
      status: connectionStatus.emailMonitoring.status
    })

    return NextResponse.json({ connectionStatus })

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    const stack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Error retrieving email connection status', {
      error: errorMessage,
      stack: stack
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper functions for homeowner-friendly messaging
function getMonitoringStatus(emailSettings: EmailSettings) {
  if (!emailSettings?.gmailConnected) return 'disconnected'
  if (!emailSettings?.monitoringEnabled) return 'paused'
  
  // Check if tokens might be expired
  if (emailSettings?.gmailTokenExpiry && new Date(emailSettings.gmailTokenExpiry) < new Date()) {
    return 'needs_reconnection'
  }
  
  return 'active'
}

function getStatusMessage(emailSettings: EmailSettings) {
  const status = getMonitoringStatus(emailSettings)
  
  switch (status) {
    case 'active':
      return 'Your emails are being monitored successfully'
    case 'paused':
      return 'Email monitoring is paused - you can enable it in settings'
    case 'needs_reconnection':
      return 'Please reconnect your Gmail account to continue monitoring'
    case 'disconnected':
      return 'Connect your Gmail account to start monitoring renovation emails'
    default:
      return 'Email monitoring status unknown'
  }
} 