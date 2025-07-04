import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { oauthSessionManager } from '../../../lib/oauth-session-manager';
import { logger } from '../../../lib/logger';

/**
 * OAuth Session Management API
 * 
 * GET: Get OAuth session compliance reports
 * POST: Create or update OAuth session
 * DELETE: Revoke OAuth session
 */

// Get OAuth session information and compliance reports
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const action = searchParams.get('action');

    if (action === 'all') {
      // Get all OAuth sessions for compliance audit
      const allSessions = await oauthSessionManager.getAllOAuthSessions();
      
      return NextResponse.json({
        success: true,
        sessions: allSessions,
        totalSessions: allSessions.length,
        activeSessions: allSessions.filter(s => s.oauthStatus.isConnected).length,
        expiredSessions: allSessions.filter(s => !s.securityAssessment.tokenValid).length,
        reauthorizationRequired: allSessions.filter(s => s.securityAssessment.needsReauthorization).length
      });
    }

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    if (action === 'compliance') {
      // Get detailed compliance report for specific project
      const complianceReport = await oauthSessionManager.getComplianceReport(projectId);
      
      if (!complianceReport) {
        return NextResponse.json({ error: 'OAuth session not found' }, { status: 404 });
      }

      return NextResponse.json({
        success: true,
        complianceReport
      });
    }

    if (action === 'check-reauth') {
      // Check if reauthorization is required
      const needsReauth = await oauthSessionManager.checkReauthorizationRequired(projectId);
      
      return NextResponse.json({
        success: true,
        projectId,
        reauthorizationRequired: needsReauth
      });
    }

    // Default: Get basic OAuth session status
    const complianceReport = await oauthSessionManager.getComplianceReport(projectId);
    
    return NextResponse.json({
      success: true,
      oauthStatus: complianceReport?.oauthStatus || null,
      securityAssessment: complianceReport?.securityAssessment || null
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Failed to get OAuth session information', {
      error: errorMessage,
      stack: errorStack
    });

    return NextResponse.json(
      { error: 'Failed to get OAuth session information' },
      { status: 500 }
    );
  }
}

// Create or update OAuth session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { projectId, tokens, scopes, action } = body;

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    if (action === 'create') {
      if (!tokens || !scopes) {
        return NextResponse.json({ 
          error: 'Tokens and scopes required for creating OAuth session' 
        }, { status: 400 });
      }

      // Create new OAuth session with enhanced tracking
      const sessionId = await oauthSessionManager.createOAuthSession(
        projectId,
        session.user.id,
        tokens,
        scopes
      );

      logger.info('OAuth session created via API', {
        projectId,
        userId: session.user.id,
        sessionId
      });

      return NextResponse.json({
        success: true,
        sessionId,
        message: 'OAuth session created successfully'
      });
    }

    if (action === 'refresh') {
      if (!tokens) {
        return NextResponse.json({ 
          error: 'Tokens required for refreshing OAuth session' 
        }, { status: 400 });
      }

      // Refresh OAuth tokens
      await oauthSessionManager.refreshOAuthTokens(projectId, tokens);

      logger.info('OAuth tokens refreshed via API', {
        projectId,
        userId: session.user.id
      });

      return NextResponse.json({
        success: true,
        message: 'OAuth tokens refreshed successfully'
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Failed to manage OAuth session', {
      error: errorMessage,
      stack: errorStack
    });

    return NextResponse.json(
      { error: 'Failed to manage OAuth session' },
      { status: 500 }
    );
  }
}

// Revoke OAuth session
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const reason = searchParams.get('reason') || 'user_request';
    const details = searchParams.get('details');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
    }

    // Revoke OAuth session with audit trail
    await oauthSessionManager.revokeOAuthSession(projectId, {
      revokedAt: new Date(),
      revokedBy: session.user.id,
      reason: reason as 'security' | 'user_request' | 'token_expired' | 'policy_violation' | 'reauthorization',
      details: details || undefined
    });

    logger.info('OAuth session revoked via API', {
      projectId,
      userId: session.user.id,
      reason,
      details
    });

    return NextResponse.json({
      success: true,
      message: 'OAuth session revoked successfully'
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorStack = error instanceof Error ? error.stack : undefined;
    
    logger.error('Failed to revoke OAuth session', {
      error: errorMessage,
      stack: errorStack
    });

    return NextResponse.json(
      { error: 'Failed to revoke OAuth session' },
      { status: 500 }
    );
  }
} 