import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { prisma } from '../../lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Simple Test Endpoint ===');
    
    // Test 1: Session validation
    console.log('Testing session...');
    const session = await getServerSession(authOptions);
    console.log('Session result:', session);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        step: 'session_failed',
        error: 'No session or user ID',
        session: session
      }, { status: 401 });
    }
    
    // Test 2: Basic database connection
    console.log('Testing database connection...');
    await prisma.$connect();
    console.log('Database connected successfully');
    
    // Test 3: Simple user count query
    console.log('Testing simple user query...');
    const userCount = await prisma.user.count();
    console.log('User count:', userCount);
    
    // Test 4: Find current user
    console.log('Finding current user...');
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id }
    });
    console.log('Current user:', currentUser);
    
    // Test 5: Simple project count for user
    console.log('Testing simple project count...');
    const projectCount = await prisma.project.count({
      where: { userId: session.user.id }
    });
    console.log('Project count for user:', projectCount);
    
    return NextResponse.json({
      success: true,
      session: {
        hasSession: !!session,
        userId: session.user.id,
        userEmail: session.user.email
      },
      database: {
        connected: true,
        userCount,
        currentUser: !!currentUser,
        projectCount
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error: unknown) {
    console.error('Test error:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
} 