import { NextResponse } from 'next/server';
import { prisma } from '../../lib/prisma';
import { withDebugSecurity, debugSecurityHeaders } from '../../lib/security-middleware';

async function handleTestDb() {
  try {
    // Test basic connection
    await prisma.$connect();
    
    // Test if we can query (this will fail if tables don't exist)
    const userCount = await prisma.user.count();
    
    return NextResponse.json({ 
      status: 'Connected', 
      userCount,
      timestamp: new Date().toISOString() 
    }, {
      headers: debugSecurityHeaders
    });
  } catch (error: unknown) {
    console.error('Database test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { 
      status: 500,
      headers: debugSecurityHeaders
    });
  } finally {
    await prisma.$disconnect();
  }
}

export const GET = withDebugSecurity(handleTestDb) 