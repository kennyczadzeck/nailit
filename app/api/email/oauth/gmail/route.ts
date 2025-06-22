import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../../auth/[...nextauth]/route'
import { logger } from '../../../../lib/logger'
import { prisma } from '../../../../lib/prisma'

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

    // Verify user owns the project
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        userId: session.user.id
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Build Gmail OAuth URL
    const clientId = process.env.GOOGLE_CLIENT_ID
    const redirectUri = `${process.env.NEXTAUTH_URL}/api/email/oauth/gmail/callback`
    
    if (!clientId) {
      logger.error('Google Client ID not configured')
      return NextResponse.json({ error: 'OAuth not configured' }, { status: 500 })
    }

    const scopes = [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.metadata'
    ].join(' ')

    const oauthUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
    oauthUrl.searchParams.set('client_id', clientId)
    oauthUrl.searchParams.set('redirect_uri', redirectUri)
    oauthUrl.searchParams.set('response_type', 'code')
    oauthUrl.searchParams.set('scope', scopes)
    oauthUrl.searchParams.set('access_type', 'offline')
    oauthUrl.searchParams.set('prompt', 'consent')
    oauthUrl.searchParams.set('state', JSON.stringify({
      projectId,
      userId: session.user.id
    }))

    logger.info('Gmail OAuth initiated for project', {
      userId: session.user.id,
      projectId,
      projectName: project.name
    })

    return NextResponse.json({
      oauthUrl: oauthUrl.toString(),
      message: 'Gmail OAuth URL generated successfully'
    })

  } catch (error: any) {
    logger.error('Error initiating Gmail OAuth', {
      error: error.message,
      stack: error.stack
    })
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 