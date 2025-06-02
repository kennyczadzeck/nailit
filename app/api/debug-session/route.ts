import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

export async function GET(request: NextRequest) {
  try {
    console.log('Debug session endpoint called');
    console.log('Headers:', Object.fromEntries(request.headers.entries()));
    
    const session = await getServerSession(authOptions);
    console.log('Session result:', session);
    
    return NextResponse.json({
      session: session,
      hasSession: !!session,
      hasUser: !!session?.user,
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      timestamp: new Date().toISOString()
    });
  } catch (error: unknown) {
    console.error('Session debug error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'An unknown error occurred',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 