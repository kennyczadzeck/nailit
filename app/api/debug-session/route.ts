import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '../../lib/prisma';
import { withDebugSecurity, debugSecurityHeaders } from '../../lib/security-middleware';

async function handleDebugSession(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    console.log('Debug session check:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    });

    if (session?.user?.id) {
      // Check if this user ID exists in database
      const dbUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          accounts: {
            select: {
              id: true,
              type: true,
              provider: true,
              // Don't expose tokens or secrets
            }
          },
          projects: {
            select: {
              id: true,
              name: true,
              status: true,
              createdAt: true,
              // Don't expose sensitive project data
            }
          }
        }
      });

      // Sanitize session data
      const sanitizedSession = {
        user: {
          id: session.user.id,
          email: session.user.email,
          name: session.user.name,
          image: session.user.image
        },
        expires: session.expires
      };

      // Sanitize database user data
      const sanitizedDbUser = dbUser ? {
        id: dbUser.id,
        email: dbUser.email,
        name: dbUser.name,
        emailVerified: dbUser.emailVerified,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
        accountsCount: dbUser.accounts.length,
        projectsCount: dbUser.projects.length,
        projects: dbUser.projects.map(p => ({
          id: p.id,
          name: p.name,
          status: p.status,
          createdAt: p.createdAt
        }))
      } : null;

      return NextResponse.json({
        session: sanitizedSession,
        dbUser: sanitizedDbUser,
        userExistsInDb: !!dbUser,
        message: dbUser ? 'User found in database' : 'User NOT found in database - this is the problem!',
        warning: 'This endpoint is for debugging only and should not be accessible in production'
      }, {
        headers: debugSecurityHeaders
      });
    }

    return NextResponse.json({
      session: null,
      dbUser: null,
      userExistsInDb: false,
      message: 'No session found',
      warning: 'This endpoint is for debugging only and should not be accessible in production'
    }, {
      headers: debugSecurityHeaders
    });

  } catch (error) {
    console.error('Debug session error:', error);
    return NextResponse.json({ 
      error: 'Failed to check session',
      warning: 'This endpoint is for debugging only and should not be accessible in production'
    }, { 
      status: 500,
      headers: debugSecurityHeaders
    });
  }
}

// Apply security middleware
export const GET = withDebugSecurity(handleDebugSession)