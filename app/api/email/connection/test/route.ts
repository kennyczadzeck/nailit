import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Test basic functionality without authentication for now
    const mockConnectionStatus = {
      projectId: 'test-project-123',
      projectName: 'Test Renovation Project',
      
      emailMonitoring: {
        isConnected: false,
        isActivelyMonitoring: false,
        status: 'disconnected',
        statusMessage: 'Connect your Gmail account to start monitoring renovation emails'
      },
      
      recentActivity: {
        totalEmailsProcessed: 0,
        recentEmails: [],
        lastActivityAt: null,
        note: "Email processing infrastructure ready - waiting for first emails"
      },
      
      notifications: {
        emailNotifications: false,
        weeklyReports: false,
        urgentAlerts: false
      }
    }

    return NextResponse.json({ 
      success: true,
      message: 'Email connection status API is working',
      mockConnectionStatus,
      infrastructure: {
        databaseReady: true,
        emailWebhookReady: true,
        sqsQueuesReady: true,
        s3BucketReady: true
      },
      timestamp: new Date().toISOString()
    })

  } catch (error: any) {
    return NextResponse.json(
      { 
        success: false,
        error: 'Test endpoint failed',
        message: error.message 
      },
      { status: 500 }
    )
  }
} 