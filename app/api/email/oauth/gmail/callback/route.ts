import { NextRequest, NextResponse } from 'next/server'
import { logger } from '../../../../../lib/logger'
import { prisma } from '../../../../../lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    // Handle OAuth errors
    if (error) {
      logger.warn('Gmail OAuth error', { error })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?email-error=${error}`)
    }

    if (!code || !state) {
      logger.warn('Gmail OAuth callback missing parameters', { code: !!code, state: !!state })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?email-error=missing_params`)
    }

    // Parse state to get project and user info
    let stateData
    try {
      stateData = JSON.parse(state)
    } catch (parseError: any) {
      logger.error('Failed to parse OAuth state', { state, error: parseError })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?email-error=invalid_state`)
    }

    const { projectId, userId } = stateData

    if (!projectId || !userId) {
      logger.warn('Gmail OAuth state missing required fields', stateData)
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?email-error=invalid_state`)
    }

    // Exchange authorization code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.NEXTAUTH_URL}/api/email/oauth/gmail/callback`
      })
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      logger.error('Failed to exchange OAuth code for tokens', {
        status: tokenResponse.status,
        error: errorText
      })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?email-error=token_exchange`)
    }

    const tokens = await tokenResponse.json()

    if (!tokens.access_token || !tokens.refresh_token) {
      logger.error('Missing tokens in OAuth response', { hasAccessToken: !!tokens.access_token, hasRefreshToken: !!tokens.refresh_token })
      return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?email-error=missing_tokens`)
    }

    // Store tokens in database (encrypted in production)
    // For MVP, we'll store them directly - in production, encrypt these values
    const expiryDate = tokens.expires_in 
      ? new Date(Date.now() + tokens.expires_in * 1000)
      : new Date(Date.now() + 3600 * 1000) // Default 1 hour

    await prisma.emailSettings.upsert({
      where: { projectId },
      update: {
        gmailConnected: true,
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token,
        gmailTokenExpiry: expiryDate,
        monitoringEnabled: true, // Auto-enable monitoring when connecting
        notificationsEnabled: true,
        updatedAt: new Date()
      },
      create: {
        projectId,
        gmailConnected: true,
        gmailAccessToken: tokens.access_token,
        gmailRefreshToken: tokens.refresh_token,
        gmailTokenExpiry: expiryDate,
        monitoringEnabled: true,
        notificationsEnabled: true,
        weeklyReports: false,
        highPriorityAlerts: true
      }
    })

    // TODO: Set up Gmail push notifications here
    // This would involve calling the Gmail API to watch for changes
    // For now, we'll log the success and handle this in the next phase

    logger.info('Gmail OAuth successful for project', {
      userId,
      projectId,
      tokenExpiry: expiryDate.toISOString()
    })

    // Redirect to dashboard with success message
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?email-connected=true&project=${projectId}`)

  } catch (error: any) {
    logger.error('Error in Gmail OAuth callback', {
      error: error.message,
      stack: error.stack
    })
    
    return NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard?email-error=callback_failed`)
  }
} 